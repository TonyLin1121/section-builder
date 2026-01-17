/**
 * Excel 匯入對話框
 * NOTE: 通用匯入組件，支援三種匯入模式
 */
import { useState, useRef } from 'react';
import './ImportDialog.css';

interface ImportDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (file: File, mode: ImportMode) => Promise<ImportResult>;
    title?: string;
}

export type ImportMode = 'delete_all' | 'insert_only' | 'upsert';

export interface ImportResult {
    message: string;
    inserted: number;
    updated: number;
    skipped: number;
    total: number;
}

const IMPORT_MODES = [
    {
        value: 'delete_all' as ImportMode,
        label: '全部刪除後新增',
        description: '清空現有資料，匯入所有記錄',
        warning: true,
    },
    {
        value: 'insert_only' as ImportMode,
        label: '僅新增不存在',
        description: '只插入主鍵不存在的記錄，已存在的略過',
        warning: false,
    },
    {
        value: 'upsert' as ImportMode,
        label: '存在更新，不存在新增',
        description: '主鍵存在則更新，不存在則新增',
        warning: false,
    },
];

export function ImportDialog({ isOpen, onClose, onImport, title = '匯入資料' }: ImportDialogProps) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedMode, setSelectedMode] = useState<ImportMode>('upsert');
    const [isImporting, setIsImporting] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    /**
     * 處理檔案選擇
     */
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // 驗證檔案類型
            if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
                setError('只支援 Excel 檔案 (.xlsx, .xls)');
                setSelectedFile(null);
                return;
            }
            setSelectedFile(file);
            setError(null);
            setResult(null);
        }
    };

    /**
     * 處理匯入
     */
    const handleImport = async () => {
        if (!selectedFile) {
            setError('請選擇檔案');
            return;
        }

        setIsImporting(true);
        setError(null);
        setResult(null);

        try {
            const importResult = await onImport(selectedFile, selectedMode);
            setResult(importResult);
        } catch (e) {
            setError(e instanceof Error ? e.message : '匯入失敗');
        } finally {
            setIsImporting(false);
        }
    };

    /**
     * 關閉並重置
     */
    const handleClose = () => {
        setSelectedFile(null);
        setSelectedMode('upsert');
        setResult(null);
        setError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="import-dialog-overlay" onClick={handleClose}>
            <div className="import-dialog" onClick={(e) => e.stopPropagation()}>
                <div className="import-dialog-header">
                    <h2>📥 {title}</h2>
                    <button className="close-button" onClick={handleClose}>✕</button>
                </div>

                <div className="import-dialog-content">
                    {/* 檔案選擇 */}
                    <div className="file-section">
                        <label>選擇 Excel 檔案</label>
                        <div className="file-input-wrapper">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={handleFileChange}
                                disabled={isImporting}
                            />
                            {selectedFile && (
                                <span className="file-name">📄 {selectedFile.name}</span>
                            )}
                        </div>
                    </div>

                    {/* 匯入模式選擇 */}
                    <div className="mode-section">
                        <label>匯入方式</label>
                        <div className="mode-options">
                            {IMPORT_MODES.map((mode) => (
                                <label
                                    key={mode.value}
                                    className={`mode-option ${selectedMode === mode.value ? 'selected' : ''} ${mode.warning ? 'warning' : ''}`}
                                >
                                    <input
                                        type="radio"
                                        name="importMode"
                                        value={mode.value}
                                        checked={selectedMode === mode.value}
                                        onChange={() => setSelectedMode(mode.value)}
                                        disabled={isImporting}
                                    />
                                    <div className="mode-info">
                                        <span className="mode-label">{mode.label}</span>
                                        <span className="mode-description">{mode.description}</span>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* 警告訊息 */}
                    {selectedMode === 'delete_all' && (
                        <div className="warning-banner">
                            ⚠️ 此操作將刪除所有現有資料，請確認後再執行！
                        </div>
                    )}

                    {/* 錯誤訊息 */}
                    {error && (
                        <div className="error-banner">
                            ❌ {error}
                        </div>
                    )}

                    {/* 匯入結果 */}
                    {result && (
                        <div className="result-banner">
                            <h4>✅ {result.message}</h4>
                            <div className="result-stats">
                                <span>📊 總共處理: {result.total} 筆</span>
                                <span>➕ 新增: {result.inserted} 筆</span>
                                <span>✏️ 更新: {result.updated} 筆</span>
                                <span>⏭️ 略過: {result.skipped} 筆</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="import-dialog-footer">
                    <button
                        className="btn btn-secondary"
                        onClick={handleClose}
                        disabled={isImporting}
                    >
                        {result ? '關閉' : '取消'}
                    </button>
                    {!result && (
                        <button
                            className="btn btn-primary"
                            onClick={handleImport}
                            disabled={!selectedFile || isImporting}
                        >
                            {isImporting ? '匯入中...' : '開始匯入'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
