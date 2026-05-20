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

  // 控制当前哪一个平台标签处于高亮激活状态 (默认为小红书 xhs)
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

  // --- ✨ 核心：请求并精准解构文案数据流 ---
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

      // 核心拆分算法：利用后端约定的 === 分隔符切开文本
      const blocks = data.text.split('===').map((b: string) => b.trim());

      setParsedAiContent({
        xhs: blocks[0] || '暂无内容',
        tiktok: blocks[1] || '暂无内容',
        whatsapp: blocks[2] || '暂无内容',
        seo: blocks[3] || '暂无内容'
      });
      
      // 默认让第一个有内容的 Tab 亮起
      setActiveTab('xhs');

    } catch (err: any) {
      console.error('AI前端调用错误:', err.message);
      setAiError(err.message);
    } finally {
      setAiLoading(false);
    }
  };

  // --- ✨ 新增：只复制当前激活 Tab 内的干净文案 ---
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
      {/* 顶部导航纯净栏 */}
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

        {/* === 右侧固定栏：价格看板 + ✨ AI 极速矩阵分发中枢 === */}
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
                className={`w-full py-3 rounded-xl text-xs font-black tracking-wide transition-all ${
                  aiLoading 
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700 animate-pulse' 
                    : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 active:scale-[0.99] shadow-lg shadow-indigo-950'
                }`}
              >
                {aiLoading ? '🤖 正在全网渠道矩阵构思中...' : '✨ 一键生成跨平台全网获客文案'}
              </button>
              {aiError && <div className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] rounded-lg">⚠️ 触发异常: {aiError}</div>}
            </div>

            {/* ✨ 核心大招：多 Tab 独立分发视窗面板 */}
            {parsedAiContent && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden flex flex-col animate-fadeIn">
                
                {/* 网格化高质感跨平台 Tab 开关切换栏 */}
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
                      className={`py-1.5 text-[11px] font-bold rounded-lg transition-all text-center ${
                        activeTab === tab.id
                          ? 'bg-white text-gray-900 shadow-xs border border-gray-200/50'
                          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100/50'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* 动态内容渲染落地区 */}
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

                  {/* 核心内容显示：完美阻断跨频道污染 */}
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