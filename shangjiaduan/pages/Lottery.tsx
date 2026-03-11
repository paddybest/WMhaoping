import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Prize, LotteryRecord } from '../types';
import { Gift, History, X, Upload, Percent, Save } from 'lucide-react';

export const Lottery: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'prizes' | 'records'>('prizes');
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [records, setRecords] = useState<LotteryRecord[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProbabilityModalOpen, setIsProbabilityModalOpen] = useState(false);
  const [newPrize, setNewPrize] = useState({
    name: '',
    description: '',
    probability: 0.1,
    stock: 10,
    image_url: ''
  });
  const [editingPrize, setEditingPrize] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [probabilityError, setProbabilityError] = useState<string>('');

  // 预设6个奖品（固定名称，不可删除）
  // 概率总和 = 1% + 5% + 10% + 20% + 30% + 34% = 100%
  const DEFAULT_PRIZES = [
    { name: '特等奖', description: '特等奖奖品', probability: 0.01, stock: 1, image_url: '' },
    { name: '一等奖', description: '一等奖奖品', probability: 0.05, stock: 2, image_url: '' },
    { name: '二等奖', description: '二等奖奖品', probability: 0.10, stock: 5, image_url: '' },
    { name: '三等奖', description: '三等奖奖品', probability: 0.20, stock: 10, image_url: '' },
    { name: '四等奖', description: '四等奖奖品', probability: 0.30, stock: 20, image_url: '' },
    { name: '参与奖', description: '参与奖（自动计算）', probability: 0.34, stock: 100, image_url: '' }
  ];

  // 参与奖的名称（固定）
  const PARTICIPATION_PRIZE_NAME = '参与奖';

  // 计算前5个奖品概率之和（不含参与奖）
  const calculateOtherProbability = (prizeList: any[]): number => {
    return prizeList
      .filter((p: any) => p.name !== PARTICIPATION_PRIZE_NAME)
      .reduce((sum: number, p: any) => sum + (p.probability || 0), 0);
  };

  // 初始化预设奖品（确保正好6个）
  const initializePrizes = async () => {
    try {
      const res = await api.get('/merchant/prizes');
      if (res.data.success) {
        const existingPrizes = res.data.data;
        // 如果已有奖品，直接使用，不重复创建
        if (existingPrizes.length >= 6) {
          setPrizes(existingPrizes.slice(0, 6)); // 最多只显示6个
          return;
        }
        // 如果少于6个，创建缺失的预设奖品（从索引0开始）
        for (let i = 0; i < 6; i++) {
          const defaultPrize = DEFAULT_PRIZES[i];
          // 检查是否已存在同名的奖品
          const exists = existingPrizes.some(p => p.name === defaultPrize.name);
          if (!exists) {
            await api.post('/merchant/prizes', defaultPrize);
          }
        }
        // 重新获取奖品列表
        const newRes = await api.get('/merchant/prizes');
        if (newRes.data.success) {
          setPrizes(newRes.data.data.slice(0, 6)); // 最多只显示6个
        }
      }
    } catch (error) {
      console.error('Failed to initialize prizes:', error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (activeTab === 'prizes') {
          // 初始化奖品（确保有6个）
          await initializePrizes();
        } else {
          // 获取抽奖记录
          const res = await api.get('/lottery/records');
          if (res.data.success) {
            setRecords(res.data.data.records || []);
          }
        }
      } catch (error) {
        console.error('Failed to fetch lottery data:', error);
      }
    };

    fetchData();
  }, [activeTab]);

  const handleCreatePrize = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let prizeData = { ...newPrize };

      // 如果有选中图片，先上传
      if (selectedImage) {
        setUploading(true);
        const formData = new FormData();
        formData.append('image', selectedImage);

        // 先创建奖品获取ID
        const createRes = await api.post('/merchant/prizes', prizeData);
        if (!createRes.data.success) {
          alert(createRes.data.error || '创建失败');
          setSaving(false);
          setUploading(false);
          return;
        }

        const prizeId = createRes.data.data.id;

        // 上传图片
        try {
          const uploadRes = await api.post(`/merchant/prizes/${prizeId}/image`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          if (uploadRes.data.success) {
            prizeData.image_url = uploadRes.data.data.imageUrl;
          }
        } catch (uploadError) {
          console.error('Image upload failed:', uploadError);
          // 图片上传失败不阻止奖品创建
        }
        setUploading(false);
      }

      // 如果没有选择新图片，直接创建
      if (!selectedImage) {
        const res = await api.post('/merchant/prizes', prizeData);
        if (!res.data.success) {
          alert(res.data.error || '创建失败');
          setSaving(false);
          return;
        }
      }

      setIsModalOpen(false);
      setNewPrize({
        name: '',
        description: '',
        probability: 0.1,
        stock: 10,
        image_url: ''
      });
      setImagePreview('');
      setSelectedImage(null);
      // 重新获取奖品列表
      const prizesRes = await api.get('/merchant/prizes');
      if (prizesRes.data.success) {
        setPrizes(prizesRes.data.data);
      }
      alert('奖品创建成功！');
    } catch (error: any) {
      console.error('Failed to create prize:', error);
      alert(error.response?.data?.error || '创建失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePrize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPrize) return;

    setSaving(true);
    try {
      let prizeData = { ...newPrize };

      // 如果有选中新图片，先上传
      if (selectedImage) {
        setUploading(true);
        const formData = new FormData();
        formData.append('image', selectedImage);

        try {
          const uploadRes = await api.post(`/merchant/prizes/${editingPrize.id}/image`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          if (uploadRes.data.success) {
            prizeData.image_url = uploadRes.data.data.imageUrl;
          }
        } catch (uploadError) {
          console.error('Image upload failed:', uploadError);
        }
        setUploading(false);
      }

      // 更新奖品
      const res = await api.patch(`/merchant/prizes/${editingPrize.id}`, prizeData);
      if (res.data.success) {
        setIsModalOpen(false);
        setEditingPrize(null);
        setNewPrize({
          name: '',
          description: '',
          probability: 0.1,
          stock: 10,
          image_url: ''
        });
        setImagePreview('');
        setSelectedImage(null);
        // 重新获取奖品列表
        const prizesRes = await api.get('/merchant/prizes');
        if (prizesRes.data.success) {
          setPrizes(prizesRes.data.data);
        }
        alert('奖品更新成功！');
      } else {
        alert(res.data.error || '更新失败');
      }
    } catch (error: any) {
      console.error('Failed to update prize:', error);
      alert(error.response?.data?.error || '更新失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  // 关闭模态框时重置状态
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPrize(null);
    setNewPrize({
      name: '',
      description: '',
      probability: 0.1,
      stock: 10,
      image_url: ''
    });
    setImagePreview('');
    setSelectedImage(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex space-x-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('prizes')}
          className={`pb-3 px-1 font-medium text-sm transition-colors border-b-2 ${activeTab === 'prizes' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <div className="flex items-center"><Gift size={16} className="mr-2"/> 奖品设置</div>
        </button>
        <button
          onClick={() => setActiveTab('records')}
          className={`pb-3 px-1 font-medium text-sm transition-colors border-b-2 ${activeTab === 'records' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <div className="flex items-center"><History size={16} className="mr-2"/> 抽奖记录</div>
        </button>
      </div>

      {activeTab === 'prizes' ? (
        <div className="space-y-4">
            {/* 抽奖概率说明 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 flex items-center">
                    <Percent size={16} className="mr-2" />
                    抽奖概率说明
                </h4>
                <ul className="mt-2 text-sm text-blue-800 space-y-1">
                    <li>• 共有6个奖项：特等奖、一等奖、二等奖、三等奖、四等奖、参与奖</li>
                    <li>• 参与奖的概率 = 100% - (特等奖 + 一等奖 + 二等奖 + 三等奖 + 四等奖)</li>
                    <li>• 前5个奖项的概率之和不能超过100%，否则无法保存</li>
                    <li>• 库存为0时，该奖项无法被抽中</li>
                </ul>
            </div>

            {/* 概率设置区域 */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-100">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-gray-900">中奖概率设置</h3>
                        <p className="text-sm text-gray-600 mt-1">
                            当前已分配概率: <span className={`font-bold ${calculateOtherProbability(prizes) > 1 ? 'text-red-600' : 'text-green-600'}`}>
                                {(calculateOtherProbability(prizes) * 100).toFixed(1)}%
                            </span>
                            {' '}/ 100%
                        </p>
                    </div>
                    <button
                        onClick={() => setIsProbabilityModalOpen(true)}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Percent size={16} className="mr-2" />
                        设置概率
                    </button>
                </div>
                {/* 概率进度条 */}
                <div className="mt-3 h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all ${calculateOtherProbability(prizes) > 1 ? 'bg-red-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.min(calculateOtherProbability(prizes) * 100, 100)}%` }}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {prizes.map((prize: any) => (
                    <div key={prize.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col items-center text-center">
                        <div className="h-24 w-24 bg-gray-100 rounded-full mb-4 flex items-center justify-center text-gray-300">
                            {prize.image_url ? (
                                <img src={prize.image_url} alt={prize.name} className="w-full h-full object-cover rounded-full" />
                            ) : (
                                <Gift size={40} />
                            )}
                        </div>
                        <h3 className="font-bold text-gray-900">{prize.name}</h3>
                        <div className="mt-2 text-sm text-gray-500 space-y-1">
                            <p>库存: {prize.stock}</p>
                            <p>概率: {(prize.probability * 100).toFixed(1)}%</p>
                        </div>
                        <div className="mt-4 flex space-x-2 w-full">
                            <button
                                onClick={() => {
                                    setEditingPrize(prize);
                                    setNewPrize({
                                        name: prize.name,
                                        description: prize.description || '',
                                        probability: prize.probability,
                                        stock: prize.stock,
                                        image_url: prize.image_url || ''
                                    });
                                    setImagePreview(prize.image_url || '');
                                    setIsModalOpen(true);
                                }}
                                className="flex-1 py-2 text-blue-600 bg-blue-50 rounded-lg text-sm font-medium hover:bg-blue-100"
                            >
                                编辑
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
             <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">用户</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">奖品</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">时间</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {records.map(r => (
                        <tr key={r.id}>
                            <td className="px-6 py-4 text-sm text-gray-900">{r.user_nickname}</td>
                            <td className="px-6 py-4 text-sm text-green-600 font-medium">{r.prize_name}</td>
                            <td className="px-6 py-4 text-sm text-gray-500">{r.created_at}</td>
                        </tr>
                    ))}
                </tbody>
             </table>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">{editingPrize ? '编辑奖品' : '新建奖品'}</h2>
                    <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={editingPrize ? handleUpdatePrize : handleCreatePrize} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">奖品名称</label>
                        <input
                            type="text"
                            value={newPrize.name}
                            onChange={(e) => setNewPrize({ ...newPrize, name: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                        <textarea
                            rows={3}
                            value={newPrize.description}
                            onChange={(e) => setNewPrize({ ...newPrize, description: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">中签概率 (0-1)</label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="1"
                            value={newPrize.probability}
                            onChange={(e) => setNewPrize({ ...newPrize, probability: parseFloat(e.target.value) || 0 })}
                            className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">库存数量</label>
                        <input
                            type="number"
                            min="0"
                            value={newPrize.stock}
                            onChange={(e) => setNewPrize({ ...newPrize, stock: parseInt(e.target.value) || 0 })}
                            className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">奖品图片 (可选)</label>
                        <div className="space-y-2">
                            {imagePreview || newPrize.image_url ? (
                                <div className="relative inline-block">
                                    <img
                                        src={imagePreview || newPrize.image_url}
                                        alt="奖品图片预览"
                                        className="w-24 h-24 object-cover rounded-lg border"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setImagePreview('');
                                            setSelectedImage(null);
                                            setNewPrize({ ...newPrize, image_url: '' });
                                        }}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ) : (
                                <label className="border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center w-24 h-24 cursor-pointer hover:border-blue-500">
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                if (file.size > 5 * 1024 * 1024) {
                                                    alert('图片大小不能超过5MB');
                                                    return;
                                                }
                                                setSelectedImage(file);
                                                setImagePreview(URL.createObjectURL(file));
                                            }
                                        }}
                                        className="hidden"
                                        disabled={uploading}
                                    />
                                    <div className="text-center">
                                        <Upload size={24} className="mx-auto mb-1 text-gray-400" />
                                        <span className="text-xs text-gray-500">
                                            {uploading ? '上传中...' : '上传图片'}
                                        </span>
                                    </div>
                                </label>
                            )}
                        </div>
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={handleCloseModal}
                            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className={`
                                px-4 py-2 text-white bg-blue-600 rounded-lg
                                ${saving ? 'bg-blue-400 cursor-not-allowed' : 'hover:bg-blue-700'}
                            `}
                        >
                            {saving ? '保存中...' : (editingPrize ? '更新' : '保存')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* 概率设置弹窗 */}
      {isProbabilityModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">设置中奖概率</h2>
                    <button onClick={() => setIsProbabilityModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>

                {probabilityError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                        {probabilityError}
                    </div>
                )}

                <div className="space-y-4">
                    {/* 参与奖 - 只读显示 */}
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex justify-between items-center">
                            <span className="font-medium text-green-800">参与奖</span>
                            <span className="text-lg font-bold text-green-600">
                                {((1 - calculateOtherProbability(prizes)) * 100).toFixed(1)}%
                            </span>
                        </div>
                        <p className="text-xs text-green-600 mt-1">✓ 自动计算：100% - (特等奖+一等奖+二等奖+三等奖+四等奖)</p>
                    </div>

                    {/* 其他5个奖项 - 可编辑 */}
                    {prizes.filter((p: any) => p.name !== PARTICIPATION_PRIZE_NAME).map((prize: any) => (
                        <div key={prize.id} className="flex items-center space-x-3">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700">{prize.name}</label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="1"
                                    value={prize.probability}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                        const newValue = parseFloat(e.target.value) || 0;
                                        // 更新本地状态
                                        const newPrizes = [...prizes];
                                        const prizeIndex = newPrizes.findIndex(p => p.id === prize.id);
                                        if (prizeIndex !== -1) {
                                            newPrizes[prizeIndex] = { ...newPrizes[prizeIndex], probability: newValue };
                                            setPrizes(newPrizes);
                                        }
                                        // 验证总概率
                                        const otherProb = calculateOtherProbability(newPrizes);
                                        if (otherProb > 1) {
                                            setProbabilityError(`前5个奖项概率之和不能超过100%！当前: ${(otherProb * 100).toFixed(1)}%`);
                                        } else {
                                            setProbabilityError('');
                                        }
                                    }}
                                    className="w-24 border border-gray-300 rounded-lg p-2 text-right focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                                <span className="text-gray-500">%</span>
                                <span className="text-sm text-gray-400 w-12">
                                    ({(prize.probability * 100).toFixed(1)}%)
                                </span>
                            </div>
                        </div>
                    ))}

                    {/* 概率统计 */}
                    <div className="pt-4 border-t">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">前5个奖项概率合计:</span>
                            <span className={`font-bold ${calculateOtherProbability(prizes) > 1 ? 'text-red-600' : 'text-green-600'}`}>
                                {(calculateOtherProbability(prizes) * 100).toFixed(1)}%
                            </span>
                        </div>
                        <div className="flex justify-between text-sm mt-1">
                            <span className="text-gray-600">参与奖概率:</span>
                            <span className="font-bold text-green-600">
                                {((1 - calculateOtherProbability(prizes)) * 100).toFixed(1)}%
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end space-x-3 pt-6 mt-4 border-t">
                    <button
                        type="button"
                        onClick={() => {
                            setIsProbabilityModalOpen(false);
                            setProbabilityError('');
                            // 重新获取数据以恢复原状
                            initializePrizes();
                        }}
                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                        取消
                    </button>
                    <button
                        type="button"
                        disabled={saving || !!probabilityError}
                        onClick={async () => {
                            const otherProb = calculateOtherProbability(prizes);
                            if (otherProb > 1) {
                                setProbabilityError('前5个奖项概率之和不能超过100%！');
                                return;
                            }
                            setSaving(true);
                            try {
                                // 遍历保存每个非参与奖的奖品概率
                                for (const prize of prizes) {
                                    if (prize.name === PARTICIPATION_PRIZE_NAME) {
                                        // 参与奖概率 = 1 - 其他5个之和
                                        const participationProb = 1 - calculateOtherProbability(prizes);
                                        await api.patch(`/merchant/prizes/${prize.id}`, {
                                            probability: participationProb
                                        });
                                    } else {
                                        await api.patch(`/merchant/prizes/${prize.id}`, {
                                            probability: prize.probability
                                        });
                                    }
                                }
                                alert('概率设置保存成功！');
                                setIsProbabilityModalOpen(false);
                                setProbabilityError('');
                                // 重新获取奖品列表
                                const res = await api.get('/merchant/prizes');
                                if (res.data.success) {
                                    setPrizes(res.data.data.slice(0, 6));
                                }
                            } catch (error: any) {
                                console.error('Failed to save probabilities:', error);
                                alert(error.response?.data?.error || '保存失败，请重试');
                            } finally {
                                setSaving(false);
                            }
                        }}
                        className={`
                            px-4 py-2 text-white bg-blue-600 rounded-lg flex items-center
                            ${saving || probabilityError ? 'bg-blue-400 cursor-not-allowed' : 'hover:bg-blue-700'}
                        `}
                    >
                        <Save size={16} className="mr-2" />
                        {saving ? '保存中...' : '保存'}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};