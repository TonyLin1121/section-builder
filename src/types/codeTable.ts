/**
 * CodeTable (參數檔) 資料介面
 */
export interface CodeTable {
    /** 主分類代碼 */
    code_code: string;
    /** 子分類代碼 */
    code_subcode: string;
    /** 子分類名稱 */
    code_subname?: string;
    /** 內容說明 */
    code_content?: string;
    /** 系統標記 */
    sysmark?: string;
    /** 使用標記 1:使用中 0:停用 */
    used_mark?: string;
    /** 更新者 */
    upd_userid?: string;
    /** 檢查者 */
    chk_userid?: string;
    /** 更新日期 */
    upddate?: string;
    /** 更新時間 */
    updtime?: string;
    /** 備註 */
    remark?: string;
}

/**
 * 新增/編輯參數檔表單資料
 */
export type CodeTableFormData = CodeTable;

/**
 * 使用標記選項
 */
export const USED_MARK_OPTIONS = [
    { value: '1', label: '使用中' },
    { value: '0', label: '停用' },
] as const;
