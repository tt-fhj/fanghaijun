import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const propertyId = searchParams.get('propertyId');
    const apiKey = process.env.CREATOMATE_API_KEY;

    console.log('========================================');
    console.log('🎯 开始处理视频状态查询请求');
    console.log('📋 接收到的参数:', { 
      id, 
      propertyId, 
      propertyIdType: typeof propertyId,
      hasApiKey: !!apiKey 
    });

    if (!id || !apiKey) {
      console.error('❌ 缺少必要参数');
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    console.log(`🔍 向 Creatomate 查询视频状态，ID: ${id}`);

    const response = await fetch(`https://api.creatomate.com/v2/renders/${id}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    const responseText = await response.text();
    console.log('📥 Creatomate 状态查询响应状态码:', response.status);
    console.log('📥 Creatomate 响应内容:', responseText);

    if (!response.ok) {
      console.error('❌ Creatomate 查询失败');
      return NextResponse.json({ error: '查询状态失败' }, { status: response.status });
    }

    const data = JSON.parse(responseText);
    console.log('📊 解析后的 Creatomate 数据:', {
      status: data.status,
      url: data.url,
      hasUrl: !!data.url,
      urlType: typeof data.url
    });
    
    // 清理 URL，移除多余的反引号和空格
    let cleanVideoUrl = data.url;
    if (cleanVideoUrl) {
      cleanVideoUrl = cleanVideoUrl.trim().replace(/^`|`$/g, '');
      console.log('🧹 清理后的 URL:', cleanVideoUrl);
    }
    
    // 如果状态是 succeeded，并且有 propertyId 和 url，就保存到 Supabase
    const shouldSave = propertyId && data.status === 'succeeded' && cleanVideoUrl;
    console.log('💡 是否应该保存到 Supabase:', shouldSave);
    
    if (shouldSave) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
      
      console.log('🔧 Supabase 配置检查:', {
        hasUrl: !!supabaseUrl,
        hasAnonKey: !!supabaseAnonKey
      });
      
      if (supabaseUrl && supabaseAnonKey) {
        console.log('💾 开始保存到 Supabase...');
        console.log('📍 目标 propertyId:', propertyId, '类型:', typeof propertyId);
        console.log('📹 原始 URL:', data.url);
        console.log('📹 清理后 URL:', cleanVideoUrl);
        
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        
        // 直接执行更新操作，不做额外的查询
        console.log('🔄 正在执行 update 操作...');
        const updatePayload = { video_url: cleanVideoUrl };
        console.log('📋 更新 payload:', updatePayload);
        console.log('📍 propertyId:', propertyId, '类型:', typeof propertyId);
        
        // 尝试将 propertyId 转换为数字（以防它是字符串）
        const numericPropertyId = !isNaN(Number(propertyId)) ? Number(propertyId) : propertyId;
        console.log('📍 转换后的 propertyId:', numericPropertyId, '类型:', typeof numericPropertyId);
        
        const { data: updateData, error: updateError } = await supabase
          .from('properties')
          .update(updatePayload)
          .eq('id', numericPropertyId)
          .select();
        
        console.log('📤 Supabase update 响应:');
        console.log('   - updateData:', updateData);
        console.log('   - updateError:', updateError);
        
        if (updateError) {
          console.error('❌ Supabase 更新失败，详细错误:', JSON.stringify(updateError, null, 2));
          console.error('💡 提示：请检查 Supabase 的 RLS (Row Level Security) 策略是否允许 UPDATE 操作');
        } else {
          console.log('✅ 视频 URL 已成功保存到 Supabase！');
        }
      } else {
        console.error('❌ Supabase 环境变量缺失');
      }
    } else {
      console.log('⏭️ 跳过保存到 Supabase');
      if (!propertyId) console.log('   - 原因: propertyId 为空');
      if (data.status !== 'succeeded') console.log('   - 原因: status 不是 succeeded');
      if (!data.url) console.log('   - 原因: 没有 url');
    }

    console.log('========================================');

    return NextResponse.json({
      status: data.status,
      videoUrl: data.url
    });
  } catch (error: any) {
    console.error('========================================');
    console.error('❌ 查询视频状态时发生致命错误:', error);
    console.error('========================================');
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}