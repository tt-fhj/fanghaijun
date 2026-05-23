import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const apiKey = process.env.CREATOMATE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: '未在服务器配置 CREATOMATE_API_KEY 环境变量' }, { status: 500 });
    }

    const body = await request.json();
    const { title, price, description, images } = body;

    console.log('🚀 接收到的请求数据:', { title, price, imagesCount: images?.length });

    // 🌟 自动获取多张图片，最多取 3 张，如果没有则用高档占位图
    const sourceImages = images && images.length > 0 
      ? images.slice(0, 3) 
      : ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200'];

    const IMAGE_DURATION = 3;
    const TOTAL_DURATION = sourceImages.length * IMAGE_DURATION;

    // 营销文案
    const speechText = `✨ 优质房源推荐：${title || '精选住宅'}。意向租金：每月 SGD ${price || '待定'}。配置完善，即刻预约看房！`;

    console.log(`🚀 正在为 ${sourceImages.length} 张图片生成多图流短视频剧本...`);

    const renderScript = {
      output_format: 'mp4',
      width: 1080,
      height: 1920,
      frame_rate: 30,
      duration: TOTAL_DURATION,
      elements: [
        {
          type: 'audio',
          track: 1,
          time: 0,
          provider: 'openai model=tts-1 voice=alloy',
          source: speechText,
        },
        ...sourceImages.map((imgUrl: string, index: number) => ({
          type: 'image',
          track: 2,
          time: index * IMAGE_DURATION,
          duration: IMAGE_DURATION,
          source: imgUrl,
          fit: 'contain',
          background_color: '#1a1a1a',
          width: '100%',
          height: '100%',
          x: '50%',
          y: '50%',
          x_anchor: '50%',
          y_anchor: '50%',
          animations: [
            {
              type: 'fade',
              duration: 0.5,
            }
          ]
        })),
        {
          type: 'text',
          track: 3,
          time: 0,
          duration: TOTAL_DURATION,
          text: `🏠 ${title || '精选优质房源'}\n💰 SGD ${price || '3,400'} / 月`,
          y: '80%',
          width: '85%',
          font_family: 'Noto Sans SC',
          font_weight: '700',
          font_size: '52px',
          fill_color: '#ffffff',
          background_color: 'rgba(0, 0, 0, 0.75)',
          padding: '45px',
          border_radius: '20px',
          x: '50%',
          x_anchor: '50%',
          y_anchor: '50%',
        }
      ]
    };

    console.log('📤 发送给 Creatomate 的 RenderScript:', JSON.stringify(renderScript, null, 2));

    const response = await fetch('https://api.creatomate.com/v2/renders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(renderScript),
    });

    const responseText = await response.text();
    console.log('📥 Creatomate 响应:', response.status, responseText);

    if (!response.ok) {
      let errorMessage = 'Creatomate API 调用失败';
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (e) {
        errorMessage = responseText || errorMessage;
      }
      return NextResponse.json({ error: errorMessage }, { status: response.status });
    }

    const renderResult = JSON.parse(responseText);
    const finalData = Array.isArray(renderResult) ? renderResult[0] : renderResult;

    console.log('✅ Creatomate 返回成功:', finalData);

    return NextResponse.json({
      success: true,
      id: finalData.id,
      videoUrl: finalData.url,
      status: finalData.status || 'planned'
    });

  } catch (error: any) {
    console.error('❌ 后端处理视频生成时出错:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}