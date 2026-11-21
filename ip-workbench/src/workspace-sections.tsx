"use client";
import { useState } from "react";
import { members, platforms, categories, type RecordItem } from "./data";
export const reportFields: Record<string, string> = {
  posts: "发布内容数",
  followersStart: "月初粉丝",
  followersEnd: "月末粉丝",
  views: "播放／阅读量",
  likes: "点赞",
  comments: "评论",
  collects: "收藏",
  shares: "分享",
  coins: "投币",
  danmaku: "弹幕",
};
type Props = {
  tab: string;
  rows: RecordItem[];
  edit: (r: RecordItem) => void;
  create: (kind: string, extra?: Partial<RecordItem>) => void;
  download: (r: RecordItem) => void;
};
export default function WorkspaceSections({
  tab,
  rows,
  edit,
  create,
  download,
}: Props) {
  const [month, setMonth] = useState("2026-11");
  const [platform, setPlatform] = useState("全部");
  const [owner, setOwner] = useState("全部");
  const [category, setCategory] = useState("全部");
  const [search, setSearch] = useState("");
  const filtered = rows.filter(
    (r) =>
      (platform === "全部" || r.platform === platform) &&
      (owner === "全部" || r.owner === owner) &&
      (!search || (r.title + r.detail + r.category).includes(search)),
  );
  function shiftMonth(offset: number) {
    const [y, m] = month.split("-").map(Number);
    const date = new Date(y, m - 1 + offset, 1);
    setMonth(
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
    );
  }
  const reports = filtered.filter(
    (r) => r.kind === "report" && r.month === month,
  );
  const plans = filtered.filter(
    (r) => r.kind === "monthplan" && r.month === month,
  );
  const scheduled = filtered.filter(
    (r) => ["task", "content"].includes(r.kind) && r.due.startsWith(month),
  );
  const [year, monthNumber] = month.split("-").map(Number);
  const dayCount = new Date(year, monthNumber, 0).getDate();
  const startOffset = (new Date(year, monthNumber - 1, 1).getDay() + 6) % 7;
  const resources = filtered.filter(
    (r) =>
      r.kind === "resource" && (category === "全部" || r.category === category),
  );
  function exportReport(r: RecordItem) {
    const content = `# ${r.title}\n\n月份 ${r.month}\n\n平台 ${r.platform}\n\n负责人 ${r.owner}\n\n${Object.entries(
      reportFields,
    )
      .map(([key, label]) => `${label} ${r.values?.[key] ?? "待录入"}`)
      .join("\n\n")}\n\n${r.detail}`;
    const url = URL.createObjectURL(
      new Blob([content], { type: "text/markdown;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `${r.title.replace(/[\\/:*?"<>|]/g, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <div className="workspace-toolbar">
        {tab !== "library" && (
          <div className="month-picker">
            <button aria-label="上个月" onClick={() => shiftMonth(-1)}>
              ‹
            </button>
            <input
              aria-label="选择月份"
              type="month"
              required
              value={month}
              onChange={(e) => {
                if (e.target.value) setMonth(e.target.value);
              }}
            />
            <button aria-label="下个月" onClick={() => shiftMonth(1)}>
              ›
            </button>
          </div>
        )}
        <select
          aria-label="按平台筛选"
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
        >
          {["全部", ...platforms].map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <select
          aria-label="按成员筛选"
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
        >
          {["全部", ...members, "三人共同", "待认领"].map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        {tab === "library" && (
          <input
            aria-label="搜索资料"
            placeholder="搜索资料、摘要或分类"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        )}
        <button
          className="button primary toolbar-create"
          onClick={() =>
            create(
              tab === "schedule"
                ? "monthplan"
                : tab === "report"
                  ? "report"
                  : "resource",
              {
                month: tab === "library" ? "" : month,
                platform: platform === "全部" ? "共用" : platform,
                category: category === "全部" ? "项目文档" : category,
              },
            )
          }
        >
          ＋{" "}
          {tab === "schedule"
            ? "月度计划"
            : tab === "report"
              ? "运营月报"
              : "添加资料"}
        </button>
      </div>
      {tab === "schedule" && (
        <>
          <div className="section-title">
            <h2>本月工作计划</h2>
            <span>月目标、重点工作、协作需求与月底结转</span>
          </div>
          {plans.length ? (
            <div className="monthly-plans">
              {plans.map((r) => (
                <button
                  className="month-plan"
                  key={r.id}
                  onClick={() => edit(r)}
                >
                  <div className="card-top">
                    <h3>{r.title}</h3>
                    <span className="tag blue">{r.status}</span>
                  </div>
                  <p>{r.detail}</p>
                  <div className="doc-foot">
                    <span>{r.owner}</span>
                    <span>
                      {r.updatedBy ? `最后编辑 ${r.updatedBy}` : "待团队确认"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="empty compact">
              本月还没有工作计划，可点击上方新建。
            </div>
          )}
          <div className="section-title">
            <h2>任务与内容发布日历</h2>
            <button
              className="button"
              onClick={() =>
                create("content", {
                  month,
                  due: `${month}-01`,
                  platform: platform === "全部" ? "共用" : platform,
                })
              }
            >
              ＋ 发布排期
            </button>
          </div>
          <div className="calendar-wrap">
            <div className="calendar">
              <div className="weekdays">
                {["周一", "周二", "周三", "周四", "周五", "周六", "周日"].map(
                  (d) => (
                    <span key={d}>{d}</span>
                  ),
                )}
              </div>
              <div className="calendar-days">
                {Array.from({ length: startOffset }, (_, i) => (
                  <div className="calendar-day inactive" key={"empty" + i} />
                ))}
                {Array.from({ length: dayCount }, (_, i) => {
                  const day = `${month}-${String(i + 1).padStart(2, "0")}`;
                  const entries = scheduled.filter((r) => r.due === day);
                  return (
                    <div className="calendar-day" key={day}>
                      <div className="day-header">
                        <span>{i + 1}</span>
                        <button
                          aria-label={`添加${day}排期`}
                          onClick={() =>
                            create("content", {
                              month,
                              due: day,
                              platform: platform === "全部" ? "共用" : platform,
                            })
                          }
                        >
                          ＋
                        </button>
                      </div>
                      {entries.map((r) => (
                        <button
                          className={
                            "calendar-entry " +
                            (r.kind === "content" ? "publication" : "")
                          }
                          key={r.id}
                          onClick={() => edit(r)}
                        >
                          <span>
                            {r.kind === "content" ? "发布" : "任务"} ·{" "}
                            {r.platform}
                          </span>
                          <strong>{r.title}</strong>
                          <small>
                            {r.owner} · {r.status}
                          </small>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <p className="footer-note">
            日历按任务截止日和内容计划发布日期展示。日期可在条目中修改，发布后的链接与审核记录可写入内容详情。
          </p>
        </>
      )}
      {tab === "report" && (
        <>
          <div className="report-intro">
            <h2>{month.replace("-", " 年 ")} 月运营记录</h2>
            <p>
              各平台分别记录真实数据和调整依据。尚未运营或后台不可获取的字段留空，并在月报中说明。
            </p>
          </div>
          <div className="report-grid">
            {reports.map((r) => {
              const v = r.values || {};
              const growth =
                v.followersEnd != null && v.followersStart != null
                  ? v.followersEnd - v.followersStart
                  : null;
              return (
                <article className="report-card" key={r.id}>
                  <div className="card-top">
                    <span className="tag blue">{r.platform}</span>
                    <span className="tiny">{r.status}</span>
                  </div>
                  <h2>{r.owner}</h2>
                  <p className="report-month">{r.month} 账号运营月报</p>
                  <div className="report-stats">
                    <div>
                      <span>发布内容</span>
                      <strong>{v.posts ?? "—"}</strong>
                    </div>
                    <div>
                      <span>粉丝净增</span>
                      <strong>
                        {growth === null
                          ? "—"
                          : growth > 0
                            ? `+${growth}`
                            : growth}
                      </strong>
                    </div>
                    <div>
                      <span>播放／阅读</span>
                      <strong>{v.views?.toLocaleString() ?? "—"}</strong>
                    </div>
                    <div>
                      <span>赞评藏分享</span>
                      <strong>
                        {["likes", "comments", "collects", "shares"].every(
                          (k) => v[k] != null,
                        )
                          ? ["likes", "comments", "collects", "shares"]
                              .reduce((sum, k) => sum + v[k]!, 0)
                              .toLocaleString()
                          : "—"}
                      </strong>
                    </div>
                  </div>
                  <p className="report-preview">{r.detail}</p>
                  <div className="report-actions">
                    <button className="button primary" onClick={() => edit(r)}>
                      填写／查看月报
                    </button>
                    <button className="button" onClick={() => exportReport(r)}>
                      导出
                    </button>
                  </div>
                  <p className="muted">
                    {r.updatedBy ? `最后编辑 ${r.updatedBy}` : "数据待录入"}
                  </p>
                </article>
              );
            })}
          </div>
          {!reports.length && (
            <div className="empty">
              本月还没有运营月报，请选择成员和平台后新建。
            </div>
          )}
        </>
      )}
      {tab === "library" && (
        <>
          <div className="category-list">
            {categories.map((c) => (
              <button
                className={category === c ? "selected" : ""}
                key={c}
                onClick={() => setCategory(c)}
              >
                {c}
                <small>
                  {
                    rows.filter(
                      (r) =>
                        r.kind === "resource" &&
                        (c === "全部" || r.category === c),
                    ).length
                  }
                </small>
              </button>
            ))}
          </div>
          <div className="document-grid">
            {resources.map((r) => (
              <article className="library-card" key={r.id}>
                <div className="card-top">
                  <span className="tag purple">{r.category || "未分类"}</span>
                  <span className="tiny">{r.platform}</span>
                </div>
                <button className="library-title" onClick={() => edit(r)}>
                  <h2>{r.title}</h2>
                  <p>{r.detail.slice(0, 180)}</p>
                </button>
                {r.fileId && (
                  <button className="file-link" onClick={() => download(r)}>
                    下载 {r.fileName || "附件"}
                  </button>
                )}
                {r.url && /^https?:\/\//i.test(r.url) && (
                  <a
                    className="file-link"
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    打开资料链接
                  </a>
                )}
                <div className="doc-foot">
                  <span>{r.owner}</span>
                  <span>
                    {r.updatedBy ? `最后编辑 ${r.updatedBy}` : "待整理"}
                  </span>
                </div>
                <button className="text-button" onClick={() => edit(r)}>
                  编辑资料
                </button>
              </article>
            ))}
          </div>
          {!resources.length && (
            <div className="empty">
              当前分类暂无资料，可添加链接、摘要或上传文件。
            </div>
          )}
          <p className="footer-note">
            文档、图片、音视频和ZIP文件支持上传，单文件不超过20MB。资料可按分类、平台和成员检索。
          </p>
        </>
      )}
    </>
  );
}
