import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { title, price, property_type, bedrooms, bathrooms, area_sqft, facilities, description } = await request.json();

    const apiKey = process.env.OPENAI_API_KEY;
    const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

    if (!apiKey) {
      return NextResponse.json({ error: '未在服务器端检测到 OPENAI_API_KEY' }, { status: 500 });
    }

    // 严密规范分隔标记，方便前端精准使用 split('===') 进行解构
    const systemPrompt = `你是一位精通新加坡本土房地产市场的金牌房产营销专家、爆款网感文案大师。
你的任务是根据用户提供的结构化房源数据，直接生成4个不同平台维度的纯文本营销广告文案。
你必须严格按照以下格式输出，每个板块之间使用且仅使用独立一行的 === 进行分隔（不要附加任何其他多余的线段）：

【小红书爆款文案】
（在这里写富有强烈网感、带满Emoji、突出高性价比和目标人群的文案，文末带热门标签）
===
【TikTok 视频脚本】
（在这里写极具抓耳Hook开头、画面感强的快节奏Caption和脚本提示，带标签）
===
【WhatsApp 快捷转发】
（在这里写极度简明扼要、排版清晰利落、适合中介一键私发客户的精炼推文）
===
【高级 SEO 优化标题】
（在这里产出3个最能抓取搜索流量、高点击率的搜索引擎标题）`;

    const userPrompt = `请基于以下这套真实的结构化房源数据，开始你的爆款文案创作：
--------------------------------------
【房源类型】: ${property_type}
【房源标题】: ${title}
【月租金】: SGD ${price ? price.toLocaleString() : '面议'}
【户型格局】: ${bedrooms} 卧 / ${bathrooms} 卫
【实用面积】: ${area_sqft ? `${area_sqft} sqft` : '暂未提供'}
【配套设施】: ${Array.isArray(facilities) ? facilities.join(', ') : facilities}
【业主附加描述】: ${description || '无'}
--------------------------------------`;

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data.error?.message || 'OpenAI 请求失败' }, { status: response.status });
    }

    return NextResponse.json({ text: data.choices[0].message.content });

  } catch (error: any) {
    console.error('AI 后端路由发生错误:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}