import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const apiKey = process.env.CREATOMATE_API_KEY;

    if (!id || !apiKey) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    console.log(`🔍 查询视频状态，ID: ${id}`);

    const response = await fetch(`https://api.creatomate.com/v2/renders/${id}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    const responseText = await response.text();
    console.log('📥 Creatomate 状态查询响应:', response.status, responseText);

    if (!response.ok) {
      return NextResponse.json({ error: '查询状态失败' }, { status: response.status });
    }

    const data = JSON.parse(responseText);
    return NextResponse.json({
      status: data.status,
      videoUrl: data.url
    });
  } catch (error: any) {
    console.error('❌ 查询视频状态出错:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}