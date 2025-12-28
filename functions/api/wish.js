export async function onRequestPost(context) {
    const { to, question, answer, msg } = await context.request.json();
    const nameKey = to.toLowerCase().trim();
    const key = `wish:${nameKey}`;
    
    // 1. 先尝试获取该名字下已有的数据
    const existingData = await context.env.WISH_STORAGE.get(key, { type: "json" });
    
    let payload;
    if (existingData) {
        // 2. 如果已存在，保留原问答，将新消息追加到 messages 数组
        payload = {
            ...existingData,
            messages: [...existingData.messages, msg]
        };
    } else {
        // 3. 如果是第一封信，初始化结构
        payload = {
            question: question,
            answer: answer.toLowerCase().trim(),
            messages: [msg]
        };
    }
    
    // 4. 存回 KV 数据库
    await context.env.WISH_STORAGE.put(key, JSON.stringify(payload));
    
    return new Response(JSON.stringify({ success: true }), {
        headers: { "content-type": "application/json" }
    });
}

export async function onRequestGet(context) {
    const { searchParams } = new URL(context.request.url);
    const name = searchParams.get('name')?.toLowerCase().trim();
    const type = searchParams.get('type');
    
    if (!name) return new Response(JSON.stringify({ error: "Name required" }), { status: 400 });

    const key = `wish:${name}`;
    const data = await context.env.WISH_STORAGE.get(key, { type: "json" });
    
    if (!data) return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });

    // 第一阶段：只返回问题
    if (type === 'question') {
        return new Response(JSON.stringify({ question: data.question }), {
            headers: { "content-type": "application/json" }
        });
    }

    // 第二阶段：验证答案并返回所有信件列表
    if (type === 'verify') {
        const userAnswer = searchParams.get('answer')?.toLowerCase().trim();
        if (userAnswer === data.answer) {
            return new Response(JSON.stringify({ success: true, messages: data.messages }), {
                headers: { "content-type": "application/json" }
            });
        } else {
            return new Response(JSON.stringify({ success: false }), {
                headers: { "content-type": "application/json" }
            });
        }
    }
}
