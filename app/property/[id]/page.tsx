'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface Property {
  id: number;
  title: string;
  price: number;
  property_type: string;
  bedrooms: number;
  bathrooms: number;
  description: string;
  area_sqft: number;
  facilities: string | string[];
  image_urls: string[];
  video_url: string;
}

export default function PropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const propertyId = params?.id;

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // --- 🎬 模块4：AI视频 Agent 状态管理 ---
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string>('');
  const [videoStatus, setVideoStatus] = useState<string>('');
  const [rawStatus, setRawStatus] = useState<string>('idle');

  // 清理 URL 的辅助函数
  const cleanUrl = (url: string | null | undefined): string => {
    if (!url) return '';
    return url.trim().replace(/^`|`$/g, '');
  };

  // 页面加载时，如果房源已有 video_url，直接使用
  useEffect(() => {
    if (property && property.video_url) {
      const cleanedUrl = cleanUrl(property.video_url);
      console.log('📄 从 Supabase 加载视频 URL:', {
        original: property.video_url,
        cleaned: cleanedUrl
      });
      setGeneratedVideoUrl(cleanedUrl);
      setRawStatus('succeeded');
    }
  }, [property]);

  // 视频异步调度接口触发器（带智能轮询的高阶版本）
  const handleGenerateVideo = async () => {
    if (!property) return;
    
    console.log('========================================');
    console.log('🎬 开始生成视频');
    console.log('📋 房源数据:', {
      id: property.id,
      idType: typeof property.id,
      title: property.title,
      hasVideoUrl: !!property.video_url
    });
    console.log('========================================');
    
    try {
      setIsVideoLoading(true);
      setRawStatus('planned');
      setVideoStatus('🎬 正在唤醒云端 AI 多图流剪辑流水线...');

      const requestBody = {
        title: property.title,
        price: property.price,
        description: property.description,
        images: property.image_urls || [],
        propertyId: property.id,
      };
      
      console.log('📤 发送给 /api/video 的请求体:', requestBody);

      const res = await fetch('/api/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();
      console.log('📥 /api/video 响应:', data);
      
      if (!res.ok) throw new Error(data.error || '云端接口拒绝请求');

      if (data.success && data.id) {
        const taskId = data.id;
        let attempts = 0;

        const interval = setInterval(async () => {
          attempts++;
          setVideoStatus(`正在同步多图转场、配音合成进度... (${attempts}/12)`);

          if (attempts > 12) {
            clearInterval(interval);
            setIsVideoLoading(false);
            setRawStatus('failed');
            setVideoStatus('❌ 渲染超时，请稍后刷新页面重新生成');
            return;
          }

          // 向 status 接口问进度，同时传递 propertyId
          const statusUrl = `/api/video/status?id=${taskId}&propertyId=${property.id}`;
          console.log(`🔍 轮询 ${statusUrl}`);
          
          const statusRes = await fetch(statusUrl);
          const statusData = await statusRes.json();
          
          console.log('📥 状态查询响应:', statusData);
          setRawStatus(statusData.status);

          if (statusData.status === 'succeeded') {
            clearInterval(interval);
            const cleanedVideoUrl = cleanUrl(statusData.videoUrl);
            const newVideoUrl = `${cleanedVideoUrl}?t=${new Date().getTime()}`;
            console.log('✅ 视频生成成功:', {
              original: statusData.videoUrl,
              cleaned: cleanedVideoUrl,
              withCacheBust: newVideoUrl
            });
            setGeneratedVideoUrl(newVideoUrl);
            
            // 同时更新 property 对象中的 video_url（存储清理后的版本）
            setProperty(prev => prev ? { ...prev, video_url: cleanedVideoUrl } : null);
            
            // 🌟 前端直接更新 Supabase 作为备选方案
            console.log('🔄 前端尝试直接更新 Supabase...');
            try {
              const { error } = await supabase
                .from('properties')
                .update({ video_url: cleanedVideoUrl })
                .eq('id', property.id);
              
              if (error) {
                console.error('❌ 前端更新 Supabase 失败:', error);
                console.error('💡 提示：请检查 Supabase 的 RLS 策略是否允许 UPDATE');
              } else {
                console.log('✅ 前端成功更新 Supabase！');
              }
            } catch (err) {
              console.error('❌ 前端更新 Supabase 异常:', err);
            }
            
            setVideoStatus('✅ 多图流短视频一键生成大获全胜！');
            setIsVideoLoading(false);
          } else if (statusData.status === 'failed') {
            clearInterval(interval);
            setIsVideoLoading(false);
            setVideoStatus('❌ 云端渲染遭遇未知崩溃');
          }
        }, 2500);
      }
    } catch (err: any) {
      console.error('========================================');
      console.error('❌ 生成视频出错:', err);
      console.error('========================================');
      setRawStatus('failed');
      setVideoStatus(`❌ 发生异常: ${err.message}`);
      setIsVideoLoading(false);
    }
  };

  // --- ✨ AI 营销中枢状态管理 ---
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string>('');

  // 存储解构后的 4 个平台文案对象
  const [parsedAiContent, setParsedAiContent] = useState<{
    xhs: string;
    tiktok: string;
    whatsapp: string;
    seo: string;
  } | null>(null);

  // 控制当前哪一个平台标签处于高亮激活状态
  const [activeTab, setActiveTab] = useState<'xhs' | 'tiktok' | 'whatsapp' | 'seo'>('xhs');

  useEffect(() => {
    if (!propertyId) return;

    const fetchPropertyDetail = async () => {
      try {
        setLoading(true);
        const { data, error: dbError } = await supabase
          .from('properties')
          .select('*')
          .eq('id', propertyId)
          .single();

        if (dbError) throw dbError;
        if (!data) {
          setError('未找到该房源的记录');
        } else {
          setProperty(data as Property);
        }
      } catch (err: any) {
        console.error('获取房源详情失败:', err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPropertyDetail();
  }, [propertyId]);

  // 请求并精准解构文案数据流
  const generateAiMarketingText = async () => {
    if (!property) return;

    setAiLoading(true);
    setAiError('');
    setParsedAiContent(null);

    try {
      const response = await fetch('/api/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: property.title,
          price: property.price,
          property_type: property.property_type,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          area_sqft: property.area_sqft,
          facilities: property.facilities,
          description: property.description
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'AI 接口呼叫失败');

      const blocks = data.text.split('===').map((b: string) => b.trim());

      setParsedAiContent({
        xhs: blocks[0] || '暂无内容',
        tiktok: blocks[1] || '暂无内容',
        whatsapp: blocks[2] || '暂无内容',
        seo: blocks[3] || '暂无内容'
      });

      setActiveTab('xhs');

    } catch (err: any) {
      console.error('AI前端调用错误:', err.message);
      setAiError(err.message);
    } finally {
      setAiLoading(false);
    }
  };

  const handleCopyCurrentTabText = () => {
    if (!parsedAiContent) return;
    const currentText = parsedAiContent[activeTab];
    navigator.clipboard.writeText(currentText);

    const platformNames = { xhs: '📕 小红书爆款', tiktok: '🎬 TikTok 脚本', whatsapp: '💬 WhatsApp 转发', seo: '🔍 SEO 优化标题' };
    alert(`📋 复制成功！已单独将【${platformNames[activeTab]}】文案注入您的剪贴板，快去发布吧！`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-500 text-sm font-medium">正在调取 Supabase 独家房源详情...</p>
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border max-w-md w-full text-center">
          <p className="text-4xl mb-3">⚠️</p>
          <h3 className="text-lg font-bold text-gray-800 mb-2">抱歉，房源未能加载</h3>
          <p className="text-sm text-gray-500 mb-6">{error || '可能该房源已被删除'}</p>
          <button onClick={() => router.push('/')} className="w-full py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors">
            返回房源大厅
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <button onClick={() => router.push('/')} className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
            ← 返回房源大厅
          </button>
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded font-mono">
            ID: #{property.id}
          </span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-6 grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* === 左侧主内容区 === */}
        <div className="md:col-span-8 space-y-6">
          <div className="bg-gray-900 rounded-2xl overflow-hidden aspect-[16/10] relative shadow-sm border">
            {property.image_urls && property.image_urls.length > 0 ? (
              <Swiper navigation pagination={{ clickable: true }} modules={[Navigation, Pagination]} className="h-full w-full">
                {property.image_urls.map((url, idx) => (
                  <SwiperSlide key={idx}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`${property.title}-${idx}`} className="w-full h-full object-cover" />
                  </SwiperSlide>
                ))}
              </Swiper>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">暂无实拍图片</div>
            )}
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full">{property.property_type}</span>
              <span className="text-sm text-gray-400 font-medium">{property.area_sqft ? `${property.area_sqft} sqft` : '暂无面积数据'}</span>
            </div>
            <h1 className="text-2xl font-black text-gray-900">{property.title}</h1>

            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
              <div className="text-center py-2 bg-white rounded-lg"><p className="text-xs text-gray-400">卧室数量</p><p className="text-lg font-bold text-gray-800 mt-0.5">🛏️ {property.bedrooms} 间</p></div>
              <div className="text-center py-2 bg-white rounded-lg"><p className="text-xs text-gray-400">洗手间数量</p><p className="text-lg font-bold text-gray-800 mt-0.5">🚿 {property.bathrooms} 间</p></div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">📋 房源亮点与详情描述</h3>
            <p className="text-gray-600 leading-relaxed text-sm whitespace-pre-wrap bg-yellow-50/20 p-4 rounded-xl border border-yellow-100/30">{property.description || '业主未提供详细文字描述。'}</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">🏊 公共配套设施 (Facilities)</h3>
            <div className="flex flex-wrap gap-2">
              {(Array.isArray(property.facilities) ? property.facilities : typeof property.facilities === 'string' ? (property.facilities as string).split(',').map(f => f.trim()).filter(Boolean) : []).map(f => (
                <span key={f} className="text-sm bg-green-50 border border-green-100 text-green-700 px-3 py-1.5 rounded-xl font-medium">✓ {f}</span>
              ))}
            </div>
          </div>

          {property.video_url && (
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="text-sm font-bold text-purple-600 uppercase tracking-wider mb-3 flex items-center gap-1">🎬 独家实拍视频看房</h3>
              <video src={property.video_url} controls className="w-full rounded-xl bg-black max-h-[400px] shadow-inner" />
            </div>
          )}
        </div>

        {/* === 右侧固定栏：价格看板 + AI 营销控制中枢 === */}
        <div className="md:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm sticky top-24 space-y-5">
            <div>
              <p className="text-xs font-semibold text-gray-400">意向租金 (SGD / 月)</p>
              <p className="text-3xl font-black text-red-500 mt-1">SGD {property.price ? property.price.toLocaleString() : '0'}</p>
            </div>

            <hr className="border-gray-100" />

            {/* AI 触发总成控制台 */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 p-5 rounded-2xl text-white shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black tracking-widest bg-blue-500/30 text-blue-300 px-2 py-0.5 rounded border border-blue-500/20">AGENT AI MATRIX</span>
                <span className="text-[11px] text-emerald-400 flex items-center gap-1">● Cluster Online</span>
              </div>
              <button
                onClick={generateAiMarketingText}
                disabled={aiLoading}
                className={`w-full py-3 rounded-xl text-xs font-black tracking-wide transition-all ${aiLoading
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700 animate-pulse'
                  : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 active:scale-[0.99] shadow-lg shadow-indigo-950'
                  }`}
              >
                {aiLoading ? '🤖 正在全网渠道矩阵构思中...' : '✨ 一键生成跨平台全网获客文案'}
              </button>
              {aiError && <div className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] rounded-lg">⚠️ 触发异常: {aiError}</div>}
            </div>

            <div data-testid="video-generator-section">
              {/* 🎬 模块4：AI视频 Agent 入口核心按钮 */}
              <button
                onClick={handleGenerateVideo}
                disabled={isVideoLoading}
                style={{
                  width: '100%',
                  marginTop: '12px',
                  padding: '12px 16px',
                  fontSize: '11px',
                  fontWeight: '900',
                  letterSpacing: '0.05em',
                  borderRadius: '12px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  border: 'none',
                  cursor: isVideoLoading ? 'not-allowed' : 'pointer',
                  background: isVideoLoading 
                    ? 'linear-gradient(to right, #1e293b, #334155)'
                    : generatedVideoUrl 
                    ? 'linear-gradient(to right, #f59e0b, #d97706)'
                    : 'linear-gradient(to right, #9333ea, #4f46e5)',
                  color: isVideoLoading ? '#64748b' : '#ffffff',
                  transition: 'all 0.2s ease'
                }}
              >
                {isVideoLoading ? (
                  <>
                    <span style={{ animation: 'spin 1s linear infinite' }}>🔄</span>
                    <span>{videoStatus}</span>
                  </>
                ) : (
                  <>
                    <span>{generatedVideoUrl ? '🔄' : '🎬'}</span>
                    <span>{generatedVideoUrl ? '重新生成 TikTok/Shorts 营销短视频' : '一键生成 TikTok/Shorts 营销短视频'}</span>
                  </>
                )}
              </button>

              {/* 📺 视频云端打包完成后的高清播放器（全新解耦绑定） */}
              {(isVideoLoading || generatedVideoUrl) && (
                <div style={{
                  marginTop: '16px',
                  padding: '12px',
                  background: 'rgba(15, 23, 42, 0.9)',
                  borderRadius: '12px',
                  border: '1px solid rgba(168, 85, 247, 0.4)',
                  textAlign: 'left'
                }}>
                  <p style={{
                    fontSize: '11px',
                    color: '#c084fc',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontWeight: '500'
                  }}>
                    <span>🎉</span> 
                    视频渲染中心（当前状态: 
                    <span style={{ 
                      fontFamily: 'monospace', 
                      color: '#ffffff', 
                      textDecoration: 'underline' 
                    }}>
                      {rawStatus}
                    </span>
                    ）
                  </p>
                  
                  <div style={{
                    position: 'relative',
                    width: '100%',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
                    background: '#000000',
                    aspectRatio: '9/16'
                  }}>
                    {generatedVideoUrl ? (
                      <video
                        key={generatedVideoUrl}
                        src={generatedVideoUrl}
                        controls
                        autoPlay
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain'
                        }}
                      />
                    ) : (
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#64748b',
                        gap: '12px',
                        padding: '16px',
                        textAlign: 'center'
                      }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderWidth: '2px',
                          borderStyle: 'solid',
                          borderColor: '#a855f7',
                          borderTopColor: 'transparent',
                          borderRadius: '9999px',
                          animation: 'spin 1s linear infinite'
                        }}></div>
                        <p style={{ fontSize: '11px', color: '#94a3b8' }}>{videoStatus}</p>
                      </div>
                    )}
                  </div>
                  
                  <p style={{
                    fontSize: '10px',
                    color: '#9ca3af',
                    marginTop: '8px',
                    textAlign: 'center',
                    lineHeight: '1.5'
                  }}>
                    提示：多图轮播转场与内置中文 TTS 语音同步拼装约需 10 秒。
                  </p>
                </div>
              )}
            </div>

            {/* ✨ 跨平台分发视窗面板 */}
            {parsedAiContent && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden flex flex-col animate-fadeIn">
                <div className="grid grid-cols-4 bg-gray-50 border-b border-gray-100 p-1 gap-1">
                  {[
                    { id: 'xhs', label: '📕 小红书' },
                    { id: 'whatsapp', label: '💬 WA' },
                    { id: 'tiktok', label: '🎬 TikTok' },
                    { id: 'seo', label: '🔍 SEO' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`py-1.5 text-[11px] font-bold rounded-lg transition-all text-center ${activeTab === tab.id
                        ? 'bg-white text-gray-900 shadow-xs border border-gray-200/50'
                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100/50'
                        }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="p-4 bg-white relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">当前频道实时预览</span>
                    <button
                      onClick={handleCopyCurrentTabText}
                      className="text-[11px] text-blue-600 font-bold hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md transition-colors"
                    >
                      📋 复制当前文案
                    </button>
                  </div>

                  <div className="h-[260px] overflow-y-auto text-xs text-gray-600 font-sans leading-relaxed whitespace-pre-wrap bg-gray-50/70 p-3 rounded-xl border border-gray-100">
                    {parsedAiContent[activeTab]}
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => alert('已成功复制当前房源唯一链接！')}
              className="w-full py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-500 font-medium rounded-xl text-xs transition-colors border border-gray-100"
            >
              🔗 复制房源网页原始链接
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}