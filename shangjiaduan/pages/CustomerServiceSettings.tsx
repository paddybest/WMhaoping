import React, { useState, useEffect } from 'react';
import { Upload, QrCode, AlertCircle, CheckCircle, X } from 'lucide-react';
import api from '../services/api';

interface MerchantProfile {
  id: number;
  username: string;
  shopName: string;
  name: string;
  description: string;
  customerServiceQrUrl: string | null;
  qrCodeUrl: string | null;
}

export const CustomerServiceSettings: React.FC = () => {
  const [profile, setProfile] = useState<MerchantProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await api.get('/merchant/auth/profile');
      if (res.data.success) {
        setProfile(res.data.data);
        setPreviewUrl(res.data.data.customerServiceQrUrl);
      } else {
        setMessage({ type: 'error', text: res.data.message || '获取商家信息失败' });
      }
    } catch (e) {
      console.error('Failed to fetch merchant profile:', e);
      setMessage({ type: 'error', text: '获取商家信息失败，请重试' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.match(/image\/(jpeg|jpg|png|gif)/)) {
      setMessage({ type: 'error', text: '只支持JPG、PNG、GIF格式的图片' });
      return;
    }

    // 验证文件大小（最大2MB）
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: '图片大小不能超过2MB' });
      return;
    }

    // 预览图片
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    const fileInput = document.getElementById('qrCodeFile') as HTMLInputElement;
    const file = fileInput?.files?.[0];
    if (!file) {
      setMessage({ type: 'error', text: '请选择要上传的客服二维码' });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      // 使用FormData上传文件
      const formData = new FormData();
      formData.append('qrCode', file);

      // 假设有一个专门的文件上传API
      const uploadRes = await api.post('/merchant/qrcode/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (uploadRes.data.success) {
        // 更新商家信息
        const updateRes = await api.put('/merchant/auth/profile', {
          customerServiceQrUrl: uploadRes.data.url
        });

        if (updateRes.data.success) {
          setMessage({ type: 'success', text: '客服二维码上传成功！' });
          setProfile(updateRes.data.data);
          setPreviewUrl(uploadRes.data.url);
        } else {
          setMessage({ type: 'error', text: updateRes.data.message || '更新失败' });
        }
      } else {
        setMessage({ type: 'error', text: uploadRes.data.message || '上传失败' });
      }
    } catch (e) {
      console.error('Failed to upload QR code:', e);
      setMessage({ type: 'error', text: '上传失败，请重试' });
    } finally {
      setUploading(false);
    }
  };

  const handleClear = () => {
    setPreviewUrl(null);
    // 清除文件选择
    const fileInput = document.getElementById('qrCodeFile') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const dismissMessage = () => {
    setMessage(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center space-x-3">
        <QrCode className="h-8 w-8 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-800">客服信息设置</h1>
      </div>

      {/* 消息提示 */}
      {message && (
        <div className={`
          flex items-start p-4 rounded-lg text-sm
          ${message.type === 'success'
            ? 'bg-green-50 text-green-700 border-green-200'
            : 'bg-red-50 text-red-700 border-red-200'}
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5 mr-3 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            {message.text}
          </div>
          <button
            onClick={dismissMessage}
            className="ml-2 text-gray-400 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 当前客服二维码 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">当前客服二维码</h2>
          </div>
          <div className="p-6">
            {profile?.customerServiceQrUrl ? (
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <img
                    src={profile.customerServiceQrUrl}
                    alt="客服二维码"
                    className="w-64 h-64 border-2 border-gray-200 rounded-lg object-contain bg-white"
                  />
                  <div className="absolute top-2 right-2">
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded">
                      已设置
                    </span>
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  <p>当前已设置客服二维码</p>
                  <p className="mt-1">用户扫码可直接联系客服</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 space-y-3 bg-gray-50 rounded-lg">
                <Upload className="h-12 w-12 text-gray-400" />
                <p className="text-gray-500 text-center">暂未设置客服二维码</p>
              </div>
            )}
          </div>
        </div>

        {/* 更换客服二维码 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">更换客服二维码</h2>
          </div>
          <div className="p-6 space-y-6">
            {/* 文件预览 */}
            {previewUrl ? (
              <div className="relative">
                <div className="flex justify-center mb-4">
                  <img
                    src={previewUrl}
                    alt="预览"
                    className="w-48 h-48 border-2 border-blue-200 rounded-lg object-contain bg-white"
                  />
                </div>
                <button
                  onClick={handleClear}
                  className="absolute top-2 right-2 p-1 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition-colors"
                  title="清除图片"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                <Upload className="h-12 w-12 text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">点击下方按钮选择图片</p>
              </div>
            )}

            {/* 文件选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                选择客服二维码图片
              </label>
              <div className="flex items-center space-x-3">
                <input
                  id="qrCodeFile"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif"
                  onChange={handleFileChange}
                  disabled={uploading}
                  className="flex-1 text-sm text-gray-700
                    file:mr-4 file:py-2 file:border-0 file:rounded-lg
                    file:bg-gray-50 file:text-gray-500
                    file:cursor-pointer file:hover:bg-gray-100"
                />
              </div>
              <p className="mt-2 text-xs text-gray-500">
                支持 JPG、PNG、GIF 格式，最大 2MB
              </p>
            </div>

            {/* 上传按钮 */}
            <div className="flex justify-end pt-2">
              <button
                onClick={handleUpload}
                disabled={!previewUrl || uploading}
                className={`
                  flex items-center px-6 py-2.5 rounded-lg text-white font-medium shadow-sm transition-all
                  ${!previewUrl || uploading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 hover:shadow-md'}
                `}
              >
                {uploading ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-b-transparent"></div>
                    上传中...
                  </>
                ) : (
                  <>
                    <Upload size={18} className="mr-2" />
                    上传客服二维码
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 使用说明 */}
      <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
        <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          使用说明
        </h3>
        <ul className="space-y-2 text-blue-800">
          <li className="flex items-start">
            <span className="inline-block w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
            <span>请上传清晰的客服二维码图片，建议使用官方生成的二维码</span>
          </li>
          <li className="flex items-start">
            <span className="inline-block w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
            <span>用户扫码后将显示客服联系方式，可及时为用户解答问题</span>
          </li>
          <li className="flex items-start">
            <span className="inline-block w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
            <span>如需更换二维码，直接上传新图片即可覆盖</span>
          </li>
          <li className="flex items-start">
            <span className="inline-block w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
            <span>建议定期检查二维码是否有效，确保用户正常联系客服</span>
          </li>
        </ul>
      </div>
    </div>
  );
};
