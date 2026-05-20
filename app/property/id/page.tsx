'use client';

import { useParams, useRouter } from 'next/navigation';

export default function PropertyDetailTest() {
  const params = useParams();
  const router = useRouter();
  
  // params.id 对应的就是 URL 中 /[id] 的具体值
  const propertyId = params?.id;

  return (
    <div className="min-h-screen bg-gray-50 p-8 flex flex-col items-center justify-center">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">🚪 房源详情页骨架已打通</h1>
        <p className="text-gray-600 mb-6">
          当前正在访问的房源 ID 是: <span className="text-blue-600 font-mono font-bold text-lg">#{propertyId}</span>
        </p>
        <button 
          onClick={() => router.push('/')}
          className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          ← 返回房源管理首页
        </button>
      </div>
    </div>
  );
}