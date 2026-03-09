import { useState } from "react";

/**
 * 激活码管理页面（卖家专用）
 *
 * 功能：输入客户机器码 → 生成激活码 → 一键复制
 */
export default function LicenseAdminPage() {
    const [machineCode, setMachineCode] = useState("");
    const [days, setDays] = useState(0);
    const [plan, setPlan] = useState("basic");
    const [secret, setSecret] = useState("");
    const [result, setResult] = useState<{
        licenseKey: string;
        expiresAt: string;
    } | null>(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleGenerate = async () => {
        setError("");
        setResult(null);
        setCopied(false);

        if (!machineCode.trim()) {
            setError("请输入客户机器码");
            return;
        }
        if (!secret.trim()) {
            setError("请输入管理员密钥");
            return;
        }

        setLoading(true);
        try {
            const response = await fetch("/api/license/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    machineCode: machineCode.trim(),
                    days,
                    plan,
                    secret: secret.trim(),
                }),
            });

            const data = await response.json();
            if (data.success) {
                setResult({
                    licenseKey: data.data.licenseKey,
                    expiresAt: data.data.expiresAt,
                });
            } else {
                setError(data.error || "生成失败");
            }
        } catch {
            setError("请求失败，请检查服务是否启动");
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = async () => {
        if (!result) return;
        try {
            await navigator.clipboard.writeText(result.licenseKey);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // 降级：使用 textarea 选中复制
            const textarea = document.createElement("textarea");
            textarea.value = result.licenseKey;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand("copy");
            document.body.removeChild(textarea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const planOptions = [
        { value: "basic", label: "基础版", color: "from-gray-500 to-gray-600" },
        { value: "pro", label: "专业版", color: "from-blue-500 to-indigo-600" },
        { value: "unlimited", label: "旗舰版", color: "from-amber-500 to-orange-600" },
    ];

    const daysPresets = [
        { label: "永久", value: 0 },
        { label: "30天", value: 30 },
        { label: "90天", value: 90 },
        { label: "180天", value: 180 },
        { label: "365天", value: 365 },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-lg">
                {/* 标题 */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-4">
                        <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-white/80">管理员工具</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">激活码生成器</h1>
                    <p className="text-white/50 text-sm">输入客户机器码，一键生成激活码</p>
                </div>

                {/* 主卡片 */}
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-6 space-y-5">
                    {/* 管理员密钥 */}
                    <div>
                        <label className="block text-sm font-medium text-white/70 mb-1.5">管理员密钥</label>
                        <input
                            type="password"
                            value={secret}
                            onChange={(e) => setSecret(e.target.value)}
                            placeholder="输入管理员密钥"
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                        />
                    </div>

                    {/* 机器码输入 */}
                    <div>
                        <label className="block text-sm font-medium text-white/70 mb-1.5">客户机器码</label>
                        <input
                            type="text"
                            value={machineCode}
                            onChange={(e) => setMachineCode(e.target.value.toUpperCase())}
                            placeholder="XXXX-XXXX-XXXX-XXXX"
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 font-mono text-lg tracking-wider text-center focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                        />
                    </div>

                    {/* 有效期选择 */}
                    <div>
                        <label className="block text-sm font-medium text-white/70 mb-1.5">有效期</label>
                        <div className="flex gap-2 flex-wrap">
                            {daysPresets.map((preset) => (
                                <button
                                    key={preset.value}
                                    onClick={() => setDays(preset.value)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${days === preset.value
                                        ? "bg-purple-500 text-white shadow-lg shadow-purple-500/30"
                                        : "bg-white/5 text-white/60 hover:bg-white/10 border border-white/10"
                                        }`}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 授权等级 */}
                    <div>
                        <label className="block text-sm font-medium text-white/70 mb-1.5">授权等级</label>
                        <div className="grid grid-cols-3 gap-2">
                            {planOptions.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => setPlan(option.value)}
                                    className={`px-4 py-3 rounded-xl text-sm font-bold transition-all ${plan === option.value
                                        ? `bg-gradient-to-r ${option.color} text-white shadow-lg`
                                        : "bg-white/5 text-white/60 hover:bg-white/10 border border-white/10"
                                        }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 生成按钮 */}
                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-base hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-500/25 active:scale-[0.98]"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                生成中...
                            </span>
                        ) : (
                            "🔑 生成激活码"
                        )}
                    </button>

                    {/* 错误提示 */}
                    {error && (
                        <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
                            ❌ {error}
                        </div>
                    )}

                    {/* 生成结果 */}
                    {result && (
                        <div className="space-y-3 animate-in fade-in">
                            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-emerald-400 text-sm font-medium">✅ 激活码生成成功</span>
                                    <span className="text-white/40 text-xs">({result.expiresAt === "永久" ? "永久有效" : `过期: ${result.expiresAt}`})</span>
                                </div>
                                <div className="bg-black/30 rounded-lg p-3 font-mono text-xs text-emerald-300 break-all leading-relaxed select-all">
                                    {result.licenseKey}
                                </div>
                            </div>
                            <button
                                onClick={handleCopy}
                                className={`w-full py-3 rounded-xl font-medium text-sm transition-all ${copied
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                    : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
                                    }`}
                            >
                                {copied ? "✅ 已复制到剪贴板" : "📋 复制激活码"}
                            </button>
                        </div>
                    )}
                </div>

                {/* 底部提示 */}
                <p className="text-center text-white/30 text-xs mt-4">
                    将生成的激活码发送给客户 · 客户在软件中粘贴即可激活
                </p>
            </div>
        </div>
    );
}
