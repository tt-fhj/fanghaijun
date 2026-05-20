'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import Link from 'next/link'; // ✨ 引入 Next.js 路由跳转组件

// 引入 Swiper 基础及组件样式
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

// 初始化 Supabase 客户端
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 定义房源数据接口规范
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

export default function PropertyManager() {
  // --- 表单输入状态管理 ---
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [propertyType, setPropertyType] = useState('Condo (公寓)');
  const [bedrooms, setBedrooms] = useState('3');
  const [bathrooms, setBathrooms] = useState('2');
  const [area, setArea] = useState('');
  const [description, setDescription] = useState('');
  const [facilities, setFacilities] = useState<string[]>([]);
  
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // --- 房源列表状态管理 ---
  const [properties, setProperties] = useState<Property[]>([]);

  // 新加坡常用配套设施选项
  const facilityOptions = ['Swimming Pool', 'Gym', 'BBQ Pit', 'Security 24h', 'Tennis Court', 'Playground'];

  // 异步获取最新的房源数据列表
  const fetchProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('id', { ascending: false }); 

      if (error) throw error;
      if (data) {
        setProperties(data as Property[]);
      }
    } catch (err: any) {
      console.error('获取房源列表失败:', err.message);
    }
  };

  // 组件挂载时自动拉取数据
  useEffect(() => {
    fetchProperties();
  }, []);

  // 处理配套设施的复选框勾选逻辑
  const handleFacilityChange = (facility: string) => {
    if (facilities.includes(facility)) {
      setFacilities(facilities.filter(f => f !== facility));
    } else {
      setFacilities([...facilities, facility]);
    }
  };

  // 通用文件上传函数
  const uploadFile = async (file: File, bucket: string): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file);

    if (uploadError) {
      console.error(`存储桶 [${bucket}] 上传失败:`, uploadError.message);
      return null;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
  };

  // 提交发布完整表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // 1. 上传多张房源图片
      const uploadedImageUrls: string[] = [];
      for (const file of imageFiles) {
        const url = await uploadFile(file, 'property-media');
        if (url) uploadedImageUrls.push(url);
      }

      // 2. 上传房源视频
      let uploadedVideoUrl = '';
      if (videoFile) {
        const url = await uploadFile(videoFile, 'property-media');
        if (url) uploadedVideoUrl = url;
      }

      // 3. 将数据插入到 Supabase 表中
      const { error: dbError } = await supabase
        .from('properties')
        .insert([
          {
            title,
            price: price ? parseFloat(price) : null,
            property_type: propertyType,
            bedrooms: bedrooms ? parseInt(bedrooms) : null,
            bathrooms: bathrooms ? parseInt(bathrooms) : null,
            description,
            area_sqft: area ? parseFloat(area) : null, 
            facilities,
            video_url: uploadedVideoUrl,
            image_urls: uploadedImageUrls,
          },
        ]);

      if (dbError) throw dbError;

      setMessage({ type: 'success', text: '🎉 房源上传成功！已同步至 Supabase 数据库。' });
      
      // 成功后清空表单项
      setTitle(''); setPrice(''); setArea(''); setDescription('');
      setFacilities([]); setImageFiles([]); setVideoFile(null);
      
      // 触发刷新列表
      fetchProperties();

    } catch (err: any) {
      setMessage({ type: 'error', text: `❌ 上传失败: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* ================= 左侧栏：发布房源表单栏 ================= */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
          <h1 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            🏡 AI 房源管理系统 (MVP)
          </h1>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">房源标题</label>
              <input type="text" required placeholder="例如: Lakeside MRT 3卧高层精装" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-500" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">价格 (SGD/月)</label>
                <input type="number" required placeholder="例如: 4500" value={price} onChange={e => setPrice(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-gray-800" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">面积 (sqft)</label>
                <input type="number" required placeholder="例如: 1100" value={area} onChange={e => setArea(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-gray-800" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">房源类型</label>
              <select value={propertyType} onChange={e => setPropertyType(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-gray-800">
                <option>Condo (公寓)</option>
                <option>HDB (组屋)</option>
                <option>Landed (排屋/别墅)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">卧室数量</label>
                <input type="number" value={bedrooms} onChange={e => setBedrooms(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-gray-800" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">洗手间数量</label>
                <input type="number" value={bathrooms} onChange={e => setBathrooms(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-gray-800" />
              </div>
            </div>

            {/* 配套设施 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">配套设施 (Facilities)</label>
              <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
                {facilityOptions.map(item => (
                  <label key={item} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={facilities.includes(item)} onChange={() => handleFacilityChange(item)} className="rounded text-blue-600" />
                    {item}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">房源描述</label>
              <textarea rows={3} placeholder="介绍一下房源周边的交通、学校和亮点..." value={description} onChange={e => setDescription(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-gray-800" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">房源图片 (可多选)</label>
              <input type="file" multiple accept="image/*" onChange={e => setImageFiles(Array.from(e.target.files || []))} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
              {imageFiles.length > 0 && <p className="text-xs text-gray-500 mt-1">已选择 {imageFiles.length} 张图片</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">房源视频 (单个文件)</label>
              <input type="file" accept="video/*" onChange={e => setVideoFile(e.target.files?.[0] || null)} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100" />
            </div>

            <button type="submit" disabled={loading} className={`w-full py-3 rounded-xl font-medium text-white transition-all ${loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-100'}`}>
              {loading ? '正在全力上传中...' : '发布完全体房源'}
            </button>

            {message.text && (
              <div className={`p-3 rounded-lg text-sm text-center font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {message.text}
              </div>
            )}
          </form>
        </div>

        {/* ================= 右侧栏：线上房源展示列表 ================= */}
        <div className="lg:col-span-7 space-y-6">
          <h2 className="text-xl font-bold text-gray-800 flex items-center justify-between">
            <span>✨ 线上房源实时展示 ({properties.length})</span>
            <button onClick={fetchProperties} className="text-xs text-blue-600 hover:underline">手动刷新</button>
          </h2>

          {properties.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-gray-100 text-center text-gray-400">
              暂无线上房源，快在左侧发布你的第一套吧！
            </div>
          ) : (
            <div className="space-y-6">
              {properties.map((item) => (
                /* ✨ 核心修复：用标准的 Link 包裹，去除 block/grid 冲突，增加 group 悬停联动效果 */
                <Link href={`/property/${item.id}`} key={item.id} className="block group decoration-transparent">
                  
                  {/* 内部承载样式的真实 div */}
                  <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-12 gap-0 group-hover:shadow-md transition-shadow cursor-pointer text-left">
                    
                    {/* 图片轮播区域 */}
                    <div className="md:col-span-5 bg-gray-900 relative min-h-[240px] md:min-h-full">
                      {item.image_urls && item.image_urls.length > 0 ? (
                        <Swiper navigation pagination={{ clickable: true }} modules={[Navigation, Pagination]} className="h-full w-full absolute inset-0">
                          {item.image_urls.map((url, idx) => (
                            <SwiperSlide key={idx} className="flex items-center justify-center">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={url} alt={`${item.title}-${idx}`} className="w-full h-full object-cover" />
                            </SwiperSlide>
                          ))}
                        </Swiper>
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500 text-sm">无图片</div>
                      )}
                    </div>

                    {/* 详情数据内容展示区 */}
                    <div className="md:col-span-7 p-5 flex flex-col justify-between space-y-4">
                      <div>
                        {/* 标题 & 房源分类 */}
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-lg text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors">{item.title}</h3>
                          <span className="text-xs bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded-full shrink-0">
                            {item.property_type}
                          </span>
                        </div>

                        {/* 租金 & 面积 */}
                        <div className="mt-2 flex items-baseline gap-3">
                          <span className="text-xl font-black text-red-500">SGD {item.price ? item.price.toLocaleString() : '0'}</span>
                          <span className="text-xs text-gray-400">/ 月</span>
                          <span className="text-sm text-gray-500 ml-auto font-medium">
                            {item.area_sqft ? `${item.area_sqft} sqft` : '暂无面积 data'}
                          </span>
                        </div>

                        {/* 布局指标 */}
                        <div className="mt-3 flex gap-4 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                          <span className="flex items-center gap-1">🛏️ <b>{item.bedrooms}</b> 卧</span>
                          <span className="flex items-center gap-1">🚿 <b>{item.bathrooms}</b> 卫</span>
                        </div>

                        {/* 描述文本 */}
                        <p className="mt-3 text-sm text-gray-500 line-clamp-2 bg-yellow-50/30 p-2 rounded border border-yellow-100/20">
                          {item.description || '暂无描述。'}
                        </p>

                        {/* 设施配套标签 */}
                        {item.facilities && (
                          <div className="mt-3 flex flex-wrap gap-1">
                            {(Array.isArray(item.facilities)
                              ? item.facilities
                              : typeof item.facilities === 'string'
                              ? (item.facilities as string).split(',').map(f => f.trim()).filter(Boolean)
                              : []
                          ).map(f => (
                              <span key={f} className="text-[11px] bg-green-50 text-green-700 px-2 py-0.5 rounded font-medium">
                                ✓ {f}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* 短视频播放模块 */}
                      {item.video_url && (
                        <div className="pt-2 border-t border-gray-100" onClick={(e) => e.preventDefault()}>
                          <p className="text-xs text-purple-600 font-bold mb-1 flex items-center gap-1">🎬 房源独家实拍视频：</p>
                          <video src={item.video_url} controls className="w-full rounded-lg bg-black max-h-[140px]" />
                        </div>
                      )}
                    </div>

                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}