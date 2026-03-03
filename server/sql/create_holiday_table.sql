-- ============================================
-- 假日檔（Holiday）資料表
-- NOTE: 記錄例假日與補班日，供請假行事曆標示使用
-- ============================================

CREATE TABLE IF NOT EXISTS holiday (
    date        VARCHAR(8)   PRIMARY KEY,          -- 日期 YYYYMMDD
    is_holiday  BOOLEAN      NOT NULL DEFAULT TRUE, -- true=例假日, false=補班日
    description VARCHAR(100) NOT NULL DEFAULT '',   -- 描述（如：國慶日、補班）
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- 建立索引以加速日期區間查詢
CREATE INDEX IF NOT EXISTS idx_holiday_date ON holiday (date);

COMMENT ON TABLE holiday IS '假日檔：記錄例假日與補班日';
COMMENT ON COLUMN holiday.date IS '日期 YYYYMMDD';
COMMENT ON COLUMN holiday.is_holiday IS 'true=例假日, false=補班日';
COMMENT ON COLUMN holiday.description IS '描述說明';

-- ============================================
-- 插入 2026 年範例資料（可依需求調整）
-- ============================================

-- 2026 年例假日（國定假日）
INSERT INTO holiday (date, is_holiday, description) VALUES
    ('20260101', TRUE, '元旦'),
    ('20260126', TRUE, '除夕'),
    ('20260127', TRUE, '春節'),
    ('20260128', TRUE, '春節'),
    ('20260129', TRUE, '春節'),
    ('20260130', TRUE, '春節'),
    ('20260202', TRUE, '春節（調整放假）'),
    ('20260228', TRUE, '和平紀念日'),
    ('20260302', TRUE, '228 調整放假'),
    ('20260404', TRUE, '兒童節'),
    ('20260405', TRUE, '清明節'),
    ('20260406', TRUE, '清明節（調整放假）'),
    ('20260501', TRUE, '勞動節'),
    ('20260531', TRUE, '端午節'),
    ('20260601', TRUE, '端午節（調整放假）'),
    ('20261004', TRUE, '中秋節'),
    ('20261005', TRUE, '中秋節（調整放假）'),
    ('20261010', TRUE, '國慶日'),
    ('20261012', TRUE, '國慶日（調整放假）')
ON CONFLICT (date) DO NOTHING;

-- 2026 年補班日
INSERT INTO holiday (date, is_holiday, description) VALUES
    ('20260131', FALSE, '補班（春節調整）'),
    ('20260407', FALSE, '補班（清明節調整）'),
    ('20260606', FALSE, '補班（端午節調整）'),
    ('20261003', FALSE, '補班（中秋節調整）')
ON CONFLICT (date) DO NOTHING;
