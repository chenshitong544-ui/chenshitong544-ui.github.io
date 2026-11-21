import { createClient } from "npm:@supabase/supabase-js@2.81.1";
const allowedOrigin = "https://chenshitong544-ui.github.io";
const kinds = [
  "task",
  "ppt",
  "plan",
  "decision",
  "metric",
  "note",
  "resource",
  "monthplan",
  "report",
  "content",
];
const members = ["陈诗彤", "沈江琴", "温馨如"];
const platforms = ["共用", "抖音", "小红书", "B站"];
const statuses = ["待确认", "待开始", "进行中", "待审核", "已完成"];
const mimeTypes: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ppt: "application/vnd.ms-powerpoint",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  zip: "application/zip",
  txt: "text/plain",
  md: "text/plain",
  csv: "text/csv",
  mp4: "video/mp4",
  mp3: "audio/mpeg",
};
Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  const cors: Record<string, string> = {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization,apikey,content-type",
    "Access-Control-Allow-Methods": "GET,PUT,POST,OPTIONS",
    Vary: "Origin",
  };
  const json = (data: unknown, status = 200) =>
    Response.json(data, {
      status,
      headers: { ...cors, "Cache-Control": "no-store" },
    });
  if (origin && origin !== allowedOrigin)
    return json({ error: "请求来源无效" }, 403);
  if (req.method === "OPTIONS")
    return new Response(null, { status: 204, headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(
      url,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const token =
      req.headers.get("Authorization")?.replace(/^Bearer /, "") || "";
    if (!token) return json({ error: "请使用完整的成员共享链接" }, 401);
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(token),
    );
    const hash = Array.from(new Uint8Array(digest), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("");
    const { data: access, error: accessError } = await admin
      .from("ipwb_access")
      .select("key_hash")
      .eq("key_hash", hash)
      .maybeSingle();
    if (accessError) throw accessError;
    if (!access)
      return json({ error: "成员链接无效，请重新打开完整共享链接" }, 401);
    const params = new URL(req.url).searchParams;
    const resource = params.get("resource");
    if (resource === "records" && req.method === "GET") {
      const records = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await admin
          .from("ipwb_records")
          .select("id,data,revision")
          .order("id")
          .range(offset, offset + 999);
        if (error) throw error;
        records.push(
          ...data
            .filter((r) => !r.data.deleted)
            .map((r) => ({ ...r.data, _etag: String(r.revision) })),
        );
        if (data.length < 1000) break;
      }
      return json({ records });
    }
    if (resource === "records" && req.method === "PUT") {
      const input = await req.json();
      const { record, etag, editor } = input;
      const revision = etag === "seed" ? 0 : Number(etag);
      if (
        !record ||
        !/^[a-zA-Z0-9-]{1,80}$/.test(record.id) ||
        !kinds.includes(record.kind) ||
        typeof record.title !== "string" ||
        !record.title.trim() ||
        record.title.length > 200 ||
        typeof record.detail !== "string" ||
        record.detail.length > 30000 ||
        !members.includes(editor) ||
        !platforms.includes(record.platform) ||
        !statuses.includes(record.status) ||
        typeof record.owner !== "string" ||
        record.owner.length > 40 ||
        !Number.isFinite(record.hours) ||
        record.hours < 0 ||
        record.hours > 1000 ||
        !Number.isSafeInteger(revision) ||
        revision < 0 ||
        typeof record.due !== "string" ||
        (record.due && !/^\d{4}-\d{2}-\d{2}$/.test(record.due))
      )
        return json({ error: "请检查标题、日期、工时和编辑人" }, 400);
      if (record.month && !/^\d{4}-\d{2}$/.test(record.month))
        return json({ error: "月份格式无效" }, 400);
      for (const field of ["category", "fileId", "fileName", "url"])
        if (
          record[field] !== undefined &&
          (typeof record[field] !== "string" || record[field].length > 2000)
        )
          return json({ error: "附加字段格式无效" }, 400);
      const values = record.values || {};
      if (
        typeof values !== "object" ||
        Array.isArray(values) ||
        Object.keys(values).length > 20 ||
        Object.values(values).some(
          (v) =>
            v !== null &&
            (typeof v !== "number" || !Number.isFinite(v) || v < 0),
        )
      )
        return json({ error: "月报数据应为非负数或留空" }, 400);
      const clean = {
        id: record.id,
        kind: record.kind,
        title: record.title.trim(),
        owner: record.owner,
        platform: record.platform,
        status: record.status,
        due: record.due,
        hours: record.hours,
        detail: record.detail,
        month: record.month || "",
        category: record.category || "",
        values,
        fileId: record.fileId || "",
        fileName: record.fileName || "",
        url: record.url || "",
        deleted: !!record.deleted,
        updatedBy: editor,
        updatedAt: new Date().toISOString(),
      };
      const { data, error } = await admin.rpc("ipwb_save_record", {
        p_id: record.id,
        p_data: clean,
        p_revision: revision,
      });
      if (error) throw error;
      if (!data?.length)
        return json(
          { error: "这条内容刚被其他成员修改，请刷新后重新编辑" },
          409,
        );
      return json({
        record: { ...data[0].data, _etag: String(data[0].revision) },
      });
    }
    if (resource === "files" && req.method === "POST") {
      if (Number(req.headers.get("Content-Length")) > 22 * 1024 * 1024)
        return json({ error: "文件请控制在20MB以内" }, 413);
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File) || file.size > 20 * 1024 * 1024)
        return json({ error: "请选择20MB以内的文件" }, 400);
      const mime = mimeTypes[file.name.split(".").pop()?.toLowerCase() || ""];
      if (!mime) return json({ error: "不支持的文件类型" }, 400);
      const fileId = crypto.randomUUID();
      const fileName = file.name.slice(0, 200);
      const { error } = await admin.storage
        .from("ipwb-files")
        .upload(fileId, file, { contentType: mime, upsert: false });
      if (error) throw error;
      const { error: metadataError } = await admin
        .from("ipwb_files")
        .insert({ id: fileId, filename: fileName, mime, object_path: fileId });
      if (metadataError) {
        await admin.storage.from("ipwb-files").remove([fileId]);
        throw metadataError;
      }
      return json({ fileId, fileName });
    }
    if (resource === "files" && req.method === "GET") {
      const id = params.get("id") || "";
      if (!/^[a-zA-Z0-9-]{1,80}$/.test(id))
        return json({ error: "文件编号无效" }, 400);
      const { data: meta, error } = await admin
        .from("ipwb_files")
        .select("filename,mime,object_path")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!meta) return json({ error: "文件不存在" }, 404);
      const { data: blob, error: downloadError } = await admin.storage
        .from("ipwb-files")
        .download(meta.object_path);
      if (downloadError) throw downloadError;
      return new Response(blob, {
        headers: {
          ...cors,
          "Content-Type": meta.mime,
          "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(meta.filename)}`,
          "Cache-Control": "private,no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    return json({ error: "此操作不可用" }, 405);
  } catch (error) {
    console.error("Workbench request failed", error);
    return json({ error: "共享服务暂不可用，请稍后重试" }, 500);
  }
});
