export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);

    // --- 处理发送愿望 (POST) ---
    if (request.method === "POST") {
        const { to, question, answer, msg } = await request.json();
        // 为每一封信生成唯一标识符，防止覆盖
        const wishId = `wish:${to.toLowerCase().trim()}:${Date.now()}`;
        
        const payload = {
            id: wishId,
            to: to.toLowerCase().trim(),
            question: question,
            answer: answer.toLowerCase().trim(),
            message: msg
        };
        
        await env.WISH_STORAGE.put(wishId, JSON.stringify(payload));
        return new Response(JSON.stringify({ success: true }), {
            headers: { "content-type": "application/json" }
        });
    }

    // --- 处理读取愿望 (GET) ---
    if (request.method === "GET") {
        const name = url.searchParams.get('name')?.toLowerCase().trim();
        const type = url.searchParams.get('type');
        const wishId = url.searchParams.get('id');

        if (!name) return new Response("Name required", { status: 400 });

        // 步骤 A: 列出该姓名下所有的密保问题列表
        if (type === 'list') {
            const list = await env.WISH_STORAGE.list({ prefix: `wish:${name}` });
            const questions = await Promise.all(
                list.keys.map(async (key) => {
                    const val = await env.WISH_STORAGE.get(key.name, { type: "json" });
                    return { id: key.name, question: val.question };
                })
            );
            return new Response(JSON.stringify(questions), {
                headers: { "content-type": "application/json" }
            });
        }

        // 步骤 B: 验证具体某封信的答案
        if (type === 'verify') {
            const userAnswer = url.searchParams.get('answer')?.toLowerCase().trim();
            const data = await env.WISH_STORAGE.get(wishId, { type: "json" });
            
            if (!data) return new Response("Not found", { status: 404 });
            
            if (userAnswer === data.answer) {
                return new Response(JSON.stringify({ success: true, message: data.message }), {
                    headers: { "content-type": "application/json" }
                });
            } else {
                return new Response(JSON.stringify({ success: false }), {
                    headers: { "content-type": "application/json" }
                });
            }
        }
    }
}
