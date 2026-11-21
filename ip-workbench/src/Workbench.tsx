"use client";
import { useEffect, useRef, useState } from "react";
import { apiFetch } from "./api";
import {
  members,
  platforms,
  statuses,
  categories,
  recordTemplates,
  type RecordItem,
} from "./data";
import WorkspaceSections, { reportFields } from "./workspace-sections";
const nav = [
  ["overview", "项目总览", "◫"],
  ["task", "任务与分工", "☑"],
  ["schedule", "月度排期", "▦"],
  ["report", "运营月报", "▥"],
  ["library", "团队资料库", "▧"],
  ["ppt", "PPT 协作", "▤"],
  ["plan", "平台运营", "◎"],
  ["decision", "待确认事项", "◇"],
  ["records", "会议与记录", "▤"],
];
const kindLabels: Record<string, string> = {
  task: "任务",
  ppt: "PPT页面",
  plan: "运营方案",
  decision: "待确认事项",
  metric: "运营数据",
  note: "协作记录",
  resource: "资料",
  monthplan: "月度计划",
  report: "运营月报",
  content: "发布排期",
};
const platformColor: Record<string, string> = {
  共用: "purple",
  抖音: "blue",
  小红书: "pink",
  B站: "teal",
};
export default function Workbench() {
  const [tab, setTab] = useState("overview");
  const [rows, setRows] = useState<RecordItem[]>([]);
  const [editor, setEditor] = useState("");
  const [key, setKey] = useState("");
  const [access, setAccess] = useState("");
  const [accessNeeded, setAccessNeeded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("全部");
  const [person, setPerson] = useState("全部");
  const [status, setStatus] = useState("全部");
  const [search, setSearch] = useState("");
  const [view, setView] = useState("看板");
  const [draft, setDraft] = useState<RecordItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [synced, setSynced] = useState("");
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const headers = (k = key) => ({
    "Content-Type": "application/json",
    ...(k ? { Authorization: `Bearer ${k}` } : {}),
  });
  async function refresh(k = key, quiet = false) {
    if (!quiet) setLoading(true);
    try {
      const r = await apiFetch("/api/records", { headers: headers(k) });
      const d = (await r.json()) as {
        error?: string;
        records: RecordItem[];
        record: RecordItem;
        key: string;
      };
      if (!r.ok) {
        if (r.status === 401) setAccessNeeded(true);
        throw Error(d.error || "读取失败");
      }
      setRows(d.records);
      setAccessNeeded(false);
      setError("");
      setSynced(
        new Date().toLocaleTimeString("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    const k =
      new URLSearchParams(location.hash.slice(1)).get("access") ||
      sessionStorage.getItem("ipwb-team-key") ||
      "";
    setKey(k);
    if (k) sessionStorage.setItem("ipwb-team-key", k);
    setEditor(localStorage.getItem("ipwb-editor") || "");
    refresh(k);
  }, []);
  useEffect(() => {
    const t = setInterval(() => {
      if (!draftRef.current) refresh(key, true);
    }, 20000);
    return () => clearInterval(t);
  }, [key]);
  function chooseEditor(v: string) {
    setEditor(v);
    localStorage.setItem("ipwb-editor", v);
  }
  function edit(row: RecordItem) {
    setDraft({ ...row });
    setError("");
  }
  function create(kind: string, extra: Partial<RecordItem> = {}) {
    edit({
      id: crypto.randomUUID(),
      kind,
      title: "",
      owner: editor || "待认领",
      platform: filter === "全部" ? "共用" : filter,
      status: "待确认",
      due: "",
      hours: 0,
      detail:
        recordTemplates[kind] ||
        (kind === "metric"
          ? "作品链接\n观察窗口（24小时／72小时／7日）\n播放／阅读\n平均观看时长／完成率\n点赞、评论、收藏、分享\n关注变化\n后台截图链接\n用户反馈\n本轮调整与后续观察"
          : kind === "note"
            ? "讨论内容\n\n决定与依据\n\n下一步及负责人"
            : ""),
      _etag: "seed",
      ...extra,
    });
  }
  async function save(row: RecordItem) {
    if (!editor) {
      setError("请先在左侧选择本次编辑人。");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const r = await apiFetch("/api/records", {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify({
          record: row,
          etag: row._etag || "seed",
          editor,
        }),
      });
      const d = (await r.json()) as {
        error?: string;
        records: RecordItem[];
        record: RecordItem;
        key: string;
      };
      if (!r.ok) throw Error(d.error || "保存失败");
      setRows((prev) =>
        row.deleted
          ? prev.filter((x) => x.id !== row.id)
          : prev.some((x) => x.id === row.id)
            ? prev.map((x) => (x.id === row.id ? d.record : x))
            : [...prev, d.record],
      );
      setDraft(null);
      setNotice("已保存到共享工作台");
      setTimeout(() => setNotice(""), 3500);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  async function share() {
    try {
      const k = key;
      if (!k) throw Error("共享访问凭证暂不可用");
      await navigator.clipboard.writeText(
        location.origin +
          location.pathname +
          "#access=" +
          encodeURIComponent(k),
      );
      setNotice("成员协作链接已复制");
      setTimeout(() => setNotice(""), 3500);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function upload(file: File) {
    if (file.size > 20 * 1024 * 1024) {
      setError("文件请控制在20MB以内");
      return;
    }
    setSaving(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const r = await apiFetch("/api/files", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}` },
        body: form,
      });
      const data = (await r.json()) as {
        error?: string;
        fileId: string;
        fileName: string;
      };
      if (!r.ok) throw Error(data.error || "上传失败");
      setDraft((prev) =>
        prev ? { ...prev, fileId: data.fileId, fileName: data.fileName } : prev,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  async function download(row: RecordItem) {
    try {
      const r = await apiFetch(
        "/api/files?id=" + encodeURIComponent(row.fileId!),
        { headers: { Authorization: `Bearer ${key}` } },
      );
      if (!r.ok) throw Error("文件下载失败，请刷新后重试");
      const url = URL.createObjectURL(await r.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = row.fileName || row.title;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function exportData() {
    const b = new Blob(
      [
        JSON.stringify(
          { exportedAt: new Date().toISOString(), records: rows },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = "事务所工作台备份.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }
  const tasks = rows.filter((x) => x.kind === "task");
  const done = tasks.filter((x) => x.status === "已完成").length;
  const percent = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const shown = rows
    .filter(
      (x) =>
        (tab === "records"
          ? ["note", "metric"].includes(x.kind)
          : x.kind === tab) &&
        (filter === "全部" || x.platform === filter) &&
        (person === "全部" || x.owner === person) &&
        (status === "全部" || x.status === status) &&
        (!search ||
          (x.title + x.detail + x.owner)
            .toLowerCase()
            .includes(search.toLowerCase())),
    )
    .sort((a, b) =>
      tab === "ppt"
        ? a.title.localeCompare(b.title)
        : a.due.localeCompare(b.due),
    );
  const card = (r: RecordItem) => (
    <button key={r.id} className="task-card" onClick={() => edit(r)}>
      <div className="card-top">
        <span className={"tag " + platformColor[r.platform]}>{r.platform}</span>
        <span className="tiny">
          {r.hours > 0 ? `${r.hours}h 预估` : kindLabels[r.kind]}
        </span>
      </div>
      <h3>{r.title}</h3>
      <p>{r.detail.split("\n")[0]}</p>
      <div className="card-foot">
        <span className="avatar small">
          {r.owner === "待认领" ? "?" : r.owner.slice(-2)}
        </span>
        <span>{r.owner}</span>
        <time>{r.due ? r.due.slice(5).replace("-", "/") : ""}</time>
      </div>
      {r.updatedBy && (
        <div className="edit-meta">
          {r.updatedBy} · {new Date(r.updatedAt!).toLocaleDateString("zh-CN")}
        </div>
      )}
    </button>
  );
  return (
    <div className="shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setTab("overview");
          }}
        >
          <span className="brand-symbol">，。</span>
          <span>
            人类未完结事务所<small>运营协作工作台</small>
          </span>
        </a>
        <nav>
          {nav.map(([id, label, icon]) => (
            <button
              key={id}
              className={tab === id ? "active" : ""}
              onClick={() => {
                setTab(id);
                setFilter("全部");
                setStatus("全部");
                setPerson("全部");
                setSearch("");
              }}
            >
              <span>{icon}</span>
              {label}
              {id === "decision" && (
                <em>
                  {
                    rows.filter(
                      (x) => x.kind === "decision" && x.status !== "已完成",
                    ).length
                  }
                </em>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="milestone">
            <span>下一节点</span>
            <strong>12 月 3 日</strong>
            <p>开题答辩 · 下午</p>
          </div>
          <label className="editor-label">
            本次编辑人
            <select
              value={editor}
              onChange={(e) => chooseEditor(e.target.value)}
            >
              <option value="">请选择成员</option>
              {members.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <p className="muted">成员身份为自行选择，用于协作署名。</p>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <span>毕业设计 / 新媒体运营</span>
          <div>
            <span className="sync">
              {synced ? `已同步 ${synced}` : "正在连接"}
            </span>
            <button className="button" onClick={() => refresh()}>
              刷新
            </button>
            <button className="button dark" onClick={share}>
              共享工作台
            </button>
          </div>
        </header>
        <div className="content">
          <div className="page-heading">
            <div>
              <span className="eyebrow">原创 IP · 三平台运营实践</span>
              <h1>{nav.find((x) => x[0] === tab)?.[1]}</h1>
              <p>
                {tab === "overview"
                  ? "从账号定位到发布、互动与复盘，把每一步落到具体负责人。"
                  : tab === "task"
                    ? "先确认工作量，再认领任务。点击卡片编辑进度与交付材料。"
                    : tab === "ppt"
                      ? "围绕运营逻辑补充页面要点、依据和素材链接。"
                      : tab === "plan"
                        ? "每个人负责一个平台的完整运营流程。"
                        : tab === "decision"
                          ? "将报告中的差异和团队讨论结果逐项确认。"
                          : "记录真实运营数据、讨论决定和共享资料。"}
              </p>
            </div>
            {!["overview", "schedule", "report", "library"].includes(tab) && (
              <button
                className="button primary"
                onClick={() => create(tab === "records" ? "note" : tab)}
              >
                ＋ 新建{tab === "records" ? "记录" : kindLabels[tab]}
              </button>
            )}
          </div>
          {notice && (
            <div className="notice" role="status">
              {notice}
            </div>
          )}
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          {accessNeeded ? (
            <section className="access-panel">
              <h2>打开成员协作链接</h2>
              <p>使用群内的完整共享链接，或粘贴访问码。</p>
              <input
                aria-label="共享访问码"
                value={access}
                onChange={(e) => setAccess(e.target.value)}
                placeholder="共享访问码"
              />
              <button
                className="button primary"
                onClick={() => {
                  setKey(access.trim());
                  sessionStorage.setItem("ipwb-team-key", access.trim());
                  refresh(access.trim());
                }}
              >
                进入工作台
              </button>
            </section>
          ) : loading ? (
            <div className="empty">正在读取共享内容…</div>
          ) : tab === "overview" ? (
            <>
              <section className="hero">
                <div>
                  <span className="eyebrow">开题准备</span>
                  <h2>开题答辩准备</h2>
                  <p>
                    抖音 · 小红书 · B站
                    <br />
                    共同 IP 资产，各自完整运营。
                  </p>
                  <button
                    className="button light"
                    onClick={() => setTab("task")}
                  >
                    查看任务与分工
                  </button>
                </div>
                <div className="hero-right">
                  <span className="punctuation">
                    ，<b>。</b>
                  </span>
                  <div className="hero-date">
                    <span>开题答辩</span>
                    <strong>2026.12.03</strong>
                    <span>下午 · 以最终通知为准</span>
                  </div>
                </div>
              </section>
              <section className="stats">
                <div>
                  <span>准备任务</span>
                  <strong>
                    {tasks.length}
                    <small>项</small>
                  </strong>
                </div>
                <div>
                  <span>已完成</span>
                  <strong>
                    {done}
                    <small>项</small>
                  </strong>
                </div>
                <div>
                  <span>待审核</span>
                  <strong>
                    {tasks.filter((x) => x.status === "待审核").length}
                    <small>项</small>
                  </strong>
                </div>
                <div>
                  <span>整体进度</span>
                  <strong>
                    {percent}
                    <small>%</small>
                  </strong>
                  <div className="progress">
                    <i style={{ width: percent + "%" }} />
                  </div>
                </div>
              </section>
              <div className="section-title">
                <h2>三个人，三个运营现场</h2>
                <span>工时为建议预估，可在任务中调整</span>
              </div>
              <section className="member-grid">
                {members.map((m, i) => {
                  const own = tasks.filter((x) => x.owner === m);
                  return (
                    <button
                      className="member-card"
                      key={m}
                      onClick={() => {
                        setTab("task");
                        setPerson(m);
                      }}
                    >
                      <div className="member-line">
                        <span
                          className={
                            "avatar " + platformColor[platforms[i + 1]]
                          }
                        >
                          {m.slice(-2)}
                        </span>
                        <span>
                          <strong>{m}</strong>
                          <small>{platforms[i + 1]}全流程运营</small>
                        </span>
                        <span
                          className={"tag " + platformColor[platforms[i + 1]]}
                        >
                          {platforms[i + 1]}
                        </span>
                      </div>
                      <p>调研定位 · 内容发布 · 互动复盘</p>
                      <div className="member-numbers">
                        <span>
                          {own.filter((x) => x.status === "已完成").length} /{" "}
                          {own.length} 项完成
                        </span>
                        <span>
                          {own.reduce((s, x) => s + x.hours, 0)}h 预估
                        </span>
                      </div>
                    </button>
                  );
                })}
              </section>
              <div className="overview-bottom">
                <section>
                  <div className="section-title">
                    <h2>近期交付</h2>
                    <button
                      className="text-button"
                      onClick={() => setTab("task")}
                    >
                      查看全部
                    </button>
                  </div>
                  <div className="upcoming">
                    {tasks
                      .filter((x) => x.status !== "已完成")
                      .sort((a, b) => a.due.localeCompare(b.due))
                      .slice(0, 5)
                      .map((r) => (
                        <button key={r.id} onClick={() => edit(r)}>
                          <span className="date-block">
                            {r.due.slice(5).replace("-", "/")}
                          </span>
                          <span>
                            <strong>{r.title}</strong>
                            <small>
                              {r.owner} · {r.status}
                            </small>
                          </span>
                          <span className={"tag " + platformColor[r.platform]}>
                            {r.platform}
                          </span>
                        </button>
                      ))}
                  </div>
                </section>
                <section>
                  <div className="section-title">
                    <h2>先一起确认</h2>
                    <button
                      className="text-button"
                      onClick={() => setTab("decision")}
                    >
                      查看全部
                    </button>
                  </div>
                  <div className="decisions">
                    {rows
                      .filter(
                        (x) => x.kind === "decision" && x.status !== "已完成",
                      )
                      .slice(0, 4)
                      .map((r) => (
                        <button key={r.id} onClick={() => edit(r)}>
                          <span className="decision-icon">◇</span>
                          <span>
                            <strong>{r.title}</strong>
                            <small>{r.status}</small>
                          </span>
                        </button>
                      ))}
                  </div>
                </section>
              </div>
              <p className="footer-note">
                任务、工时、内部截止日和 PPT 大纲为建议稿。正式工作量与 AI
                使用范围按任务书和导师口径确认。
              </p>
            </>
          ) : ["schedule", "report", "library"].includes(tab) ? (
            <WorkspaceSections
              tab={tab}
              rows={rows}
              edit={edit}
              create={create}
              download={download}
            />
          ) : (
            <>
              <div className="filters">
                <div className="platform-filters">
                  {["全部", ...platforms].map((p) => (
                    <button
                      className={filter === p ? "selected" : ""}
                      onClick={() => setFilter(p)}
                      key={p}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <div className="filter-inputs">
                  <input
                    placeholder="搜索标题或内容"
                    aria-label="搜索"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <select
                    aria-label="负责人筛选"
                    value={person}
                    onChange={(e) => setPerson(e.target.value)}
                  >
                    <option>全部</option>
                    {[...members, "待认领", "三人共同"].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                  <select
                    aria-label="状态筛选"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option>全部</option>
                    {statuses.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </div>
              </div>
              {tab === "task" && (
                <div className="view-options">
                  <span>
                    {shown.length} 项任务 ·{" "}
                    {shown.reduce((s, x) => s + x.hours, 0)}h 预估
                  </span>
                  <div>
                    {["看板", "列表"].map((x) => (
                      <button
                        key={x}
                        className={view === x ? "selected" : ""}
                        onClick={() => setView(x)}
                      >
                        {x}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {tab === "records" && (
                <div className="record-actions">
                  {["note", "metric"].map((k) => (
                    <button
                      className="button"
                      key={k}
                      onClick={() => create(k)}
                    >
                      ＋ {kindLabels[k]}
                    </button>
                  ))}
                  <button className="button" onClick={exportData}>
                    导出共享备份
                  </button>
                </div>
              )}
              {tab === "task" && view === "看板" ? (
                <div className="kanban">
                  {statuses.map((s, i) => (
                    <section className="column" key={s}>
                      <h2>
                        <span className={"status-dot s" + i} />
                        {s}
                        <em>{shown.filter((x) => x.status === s).length}</em>
                      </h2>
                      {shown.filter((x) => x.status === s).map(card)}
                      {!shown.some((x) => x.status === s) && (
                        <p className="column-empty">暂无任务</p>
                      )}
                    </section>
                  ))}
                </div>
              ) : tab === "task" ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>任务</th>
                        <th>平台</th>
                        <th>负责人</th>
                        <th>状态</th>
                        <th>截止日期</th>
                        <th>预估工时</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shown.map((r) => (
                        <tr
                          key={r.id}
                          onClick={() => edit(r)}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") edit(r);
                          }}
                        >
                          <td>{r.title}</td>
                          <td>{r.platform}</td>
                          <td>{r.owner}</td>
                          <td>{r.status}</td>
                          <td>{r.due}</td>
                          <td>{r.hours}h</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className={tab === "plan" ? "plan-grid" : "document-grid"}>
                  {shown.map((r) => (
                    <button
                      className={
                        "document-card " +
                        (tab === "plan" ? "platform-plan" : "")
                      }
                      key={r.id}
                      onClick={() => edit(r)}
                    >
                      <div className="card-top">
                        <span className={"tag " + platformColor[r.platform]}>
                          {tab === "plan" ? r.platform : kindLabels[r.kind]}
                        </span>
                        <span className="tiny">{r.status}</span>
                      </div>
                      <h2>{r.title}</h2>
                      <p>{r.detail.slice(0, 240)}</p>
                      <div className="doc-foot">
                        <span>{r.owner}</span>
                        <span>
                          {r.updatedBy
                            ? `最后编辑 ${r.updatedBy}`
                            : "待补充与确认"}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {!shown.length && <div className="empty">暂无符合条件的内容</div>}
            </>
          )}
        </div>
      </main>
      {draft && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="编辑内容"
          >
            <header>
              <span>{kindLabels[draft.kind]}</span>
              <button
                aria-label="关闭"
                onClick={() => {
                  if (!saving && confirm("关闭编辑窗口？未保存的修改将丢失。"))
                    setDraft(null);
                }}
              >
                ×
              </button>
            </header>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                save(draft);
              }}
            >
              <label>
                标题
                <input
                  required
                  maxLength={200}
                  value={draft.title}
                  onChange={(e) =>
                    setDraft({ ...draft, title: e.target.value })
                  }
                />
              </label>
              <div className="form-grid">
                <label>
                  负责人
                  <select
                    value={draft.owner}
                    onChange={(e) =>
                      setDraft({ ...draft, owner: e.target.value })
                    }
                  >
                    {[...members, "待认领", "三人共同"].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </label>
                <label>
                  平台
                  <select
                    value={draft.platform}
                    onChange={(e) =>
                      setDraft({ ...draft, platform: e.target.value })
                    }
                  >
                    {platforms.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </label>
                <label>
                  状态
                  <select
                    value={draft.status}
                    onChange={(e) =>
                      setDraft({ ...draft, status: e.target.value })
                    }
                  >
                    {statuses.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </label>
                <label>
                  截止日期
                  <input
                    type="date"
                    value={draft.due}
                    onChange={(e) =>
                      setDraft({ ...draft, due: e.target.value })
                    }
                  />
                </label>
                {draft.kind === "task" && (
                  <label>
                    预估工时
                    <input
                      type="number"
                      min="0"
                      max="1000"
                      step="0.5"
                      value={draft.hours}
                      onChange={(e) =>
                        setDraft({ ...draft, hours: Number(e.target.value) })
                      }
                    />
                  </label>
                )}
                <label>
                  本次编辑人
                  <select
                    required
                    value={editor}
                    onChange={(e) => chooseEditor(e.target.value)}
                  >
                    <option value="">选择成员</option>
                    {members.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </label>
              </div>
              {["monthplan", "report"].includes(draft.kind) && (
                <label>
                  所属月份
                  <input
                    required
                    type="month"
                    value={draft.month || ""}
                    onChange={(e) =>
                      setDraft({ ...draft, month: e.target.value })
                    }
                  />
                </label>
              )}
              {draft.kind === "report" && (
                <div className="report-values form-grid">
                  {Object.entries(reportFields)
                    .filter(
                      ([k]) =>
                        draft.platform === "B站" ||
                        !["coins", "danmaku"].includes(k),
                    )
                    .map(([k, label]) => (
                      <label key={k}>
                        {label}
                        <input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="待录入"
                          value={draft.values?.[k] ?? ""}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              values: {
                                ...draft.values,
                                [k]:
                                  e.target.value === ""
                                    ? null
                                    : Number(e.target.value),
                              },
                            })
                          }
                        />
                      </label>
                    ))}
                </div>
              )}
              {draft.kind === "resource" && (
                <>
                  <label>
                    资料分类
                    <select
                      value={draft.category || "项目文档"}
                      onChange={(e) =>
                        setDraft({ ...draft, category: e.target.value })
                      }
                    >
                      {categories.slice(1).map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    资料链接
                    <input
                      type="url"
                      placeholder="https://"
                      value={draft.url || ""}
                      onChange={(e) =>
                        setDraft({ ...draft, url: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    上传附件（20MB以内）
                    <input
                      disabled={saving}
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.zip,.txt,.md,.csv,.mp4,.mp3"
                      onChange={(e) => {
                        if (e.target.files?.[0]) upload(e.target.files[0]);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {draft.fileId && (
                    <p>
                      <button
                        className="text-button"
                        type="button"
                        onClick={() => download(draft)}
                      >
                        下载 {draft.fileName}
                      </button>
                    </p>
                  )}
                </>
              )}
              <label>
                内容、交付材料与链接
                <textarea
                  rows={12}
                  maxLength={30000}
                  value={draft.detail}
                  onChange={(e) =>
                    setDraft({ ...draft, detail: e.target.value })
                  }
                  placeholder="填写要点、讨论结果、材料链接或真实数据"
                />
              </label>
              {draft.updatedBy && (
                <p className="muted">
                  最后编辑 {draft.updatedBy} ·{" "}
                  {new Date(draft.updatedAt!).toLocaleString("zh-CN")}
                </p>
              )}
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <footer>
                <button
                  className="text-button danger"
                  disabled={saving}
                  type="button"
                  onClick={() => {
                    if (confirm("确认移除此项？"))
                      save({ ...draft, deleted: true });
                  }}
                >
                  移除此项
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="button primary"
                >
                  {saving ? "正在保存…" : "保存到共享工作台"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
