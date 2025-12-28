// 处理发送愿望 (POST)
export async function onRequestPost(context) {
    try {
        const { to, question, answer, msg } = await context.request.json();
        const nameKey = to.toLowerCase().trim();
        const key = `wish:${nameKey}`;
        
        // 1. 尝试从 KV 获取该用户已有的愿望数据
        const existingData = await context.env.WISH_STORAGE.get(key, { type: "json" });
        
        let payload;
        if (existingData) {
            // 2. 核心修复：如果已存在，则将新消息追加到数组，而不是覆盖整个文件
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
        
        // 4. 存入 KV 数据库
        await context.env.WISH_STORAGE.put(key, JSON.stringify(payload));
        
        return new Response(JSON.stringify({ success: true }), {
            headers: { "content-type": "application/json" }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}

// 处理读取愿望 (GET)
export async function onRequestGet(context) {
    const { searchParams } = new URL(context.request.url);
    const name = searchParams.get('name')?.toLowerCase().trim();
    const type = searchParams.get('type');
    
    if (!name) return new Response(JSON.stringify({ error: "请输入姓名" }), { status: 400 });

    const key = `wish:${name}`;
    const data = await context.env.WISH_STORAGE.get(key, { type: "json" });
    
    if (!data) return new Response(JSON.stringify({ error: "未找到相关信息" }), { status: 404 });

    // 第一步：返回密保问题
    if (type === 'question') {
        return new Response(JSON.stringify({ question: data.question }), {
            headers: { "content-type": "application/json" }
        });
    }

    // 第二步：验证答案并返回所有消息列表
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
