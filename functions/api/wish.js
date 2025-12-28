export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);

    // 发送愿望
    if (request.method === "POST") {
        try {
            const { to, question, answer, msg } = await request.json();
            const id = `wish:${to.toLowerCase().trim()}:${Date.now()}`;
            const data = { id, to, question, answer: answer.toLowerCase().trim(), message: msg };
            await env.WISH_STORAGE.put(id, JSON.stringify(data));
            return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
        } catch (e) {
            return new Response(JSON.stringify({ error: e.message }), { status: 500 });
        }
    }

    // 读取列表或验证
    if (request.method === "GET") {
        const name = url.searchParams.get('name')?.toLowerCase().trim();
        const type = url.searchParams.get('type');
        if (!name) return new Response("Name required", { status: 400 });

        // 获取该姓名下的所有信件列表
        if (type === 'list') {
            const list = await env.WISH_STORAGE.list({ prefix: `wish:${name}` });
            const questions = await Promise.all(list.keys.map(async (k) => {
                const v = await env.WISH_STORAGE.get(k.name, { type: "json" });
                return { id: k.name, question: v.question };
            }));
            return new Response(JSON.stringify(questions), { headers: { "Content-Type": "application/json" } });
        }

        // 验证单封信件
        if (type === 'verify') {
            const id = url.searchParams.get('id');
            const ans = url.searchParams.get('answer')?.toLowerCase().trim();
            const data = await env.WISH_STORAGE.get(id, { type: "json" });
            if (data && data.answer === ans) {
                return new Response(JSON.stringify({ success: true, message: data.message }), { headers: { "Content-Type": "application/json" } });
            }
            return new Response(JSON.stringify({ success: false }), { headers: { "Content-Type": "application/json" } });
        }
    }
}
