// 处理发送愿望
export async function onRequestPost(context) {
    const { to, question, answer, msg } = await context.request.json();
    const key = `wish:${to.toLowerCase().trim()}`;
    
    // 获取旧数据实现“追加”而不覆盖
    const existing = await context.env.WISH_STORAGE.get(key, { type: "json" });
    
    let payload = existing ? {
        ...existing,
        messages: [...existing.messages, msg]
    } : {
        question: question,
        answer: answer.toLowerCase().trim(),
        messages: [msg]
    };
    
    await context.env.WISH_STORAGE.put(key, JSON.stringify(payload));
    return new Response(JSON.stringify({ success: true }));
}

// 处理读取愿望
export async function onRequestGet(context) {
    const { searchParams } = new URL(context.request.url);
    const name = searchParams.get('name')?.toLowerCase().trim();
    const type = searchParams.get('type');
    const data = await context.env.WISH_STORAGE.get(`wish:${name}`, { type: "json" });

    if (!data) return new Response(JSON.stringify({ error: "Empty" }), { status: 404 });

    if (type === 'question') return new Response(JSON.stringify({ question: data.question }));

    if (type === 'verify') {
        const isMatch = searchParams.get('answer')?.toLowerCase().trim() === data.answer;
        return new Response(JSON.stringify(isMatch ? { success: true, messages: data.messages } : { success: false }));
    }
}