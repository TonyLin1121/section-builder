import { useCallback, useMemo } from 'react';
import { useEmployees } from './hooks/useEmployees';
import { useExport, type ExportConfig } from './hooks/useExport';
import { EmployeeForm } from './components/EmployeeForm';
import { EmployeeTable } from './components/EmployeeTable';
import { SearchBar } from './components/SearchBar';
import { PdfPreview } from './components/PdfPreview';
import { ExportDropdown, type ExportFormat } from './components/ExportDropdown';
import { Pagination } from './components/Pagination';
import type { MemberFormData, Member } from './types/employee';
import './App.css';

/**
 * 部門人員管理系統主應用
 * NOTE: 整合所有組件，提供完整的 CRUD 和 PDF 功能
 */
function App() {
  const {
    employees,
    allEmployees,
    divisions,
    searchTerm,
    setSearchTerm,
    departmentFilter,
    setDepartmentFilter,
    memberTypeFilter,
    setMemberTypeFilter,
    isEmployedFilter,
    setIsEmployedFilter,
    editingEmployee,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    startEdit,
    cancelEdit,
    refresh,
    isLoading,
    error,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalCount,
    sortBy,
    sortOrder,
    handleSort,
  } = useEmployees();

  const {
    isPreviewOpen,
    pdfDataUrl,
    isGenerating,
    previewPdf,
    downloadPdf,
    downloadCsv,
    downloadXlsx,
    closePreview,
  } = useExport();

  /**
   * 員工匯出欄位配置
   */
  const employeeExportConfig: ExportConfig = useMemo(() => ({
    filename: 'employee_list',
    title: '員工清單',
    columns: [
      { key: 'emp_id', title: '員工編號', width: 25 },
      { key: 'chinese_name', title: '中文姓名', width: 30 },
      { key: 'name', title: '英文姓名', width: 30 },
      { key: 'division_name', title: '部門', width: 30 },
      { key: 'job_title', title: '職稱', width: 35 },
      { key: 'email', title: 'Email', width: 50 },
      { key: 'cellphone', title: '手機', width: 30 },
      {
        key: 'is_employed',
        title: '狀態',
        width: 20,
        format: (value) => value ? '在職' : '離職'
      },
      {
        key: 'member_type',
        title: '類型',
        width: 25,
        format: (_, row) => {
          const types: string[] = [];
          const r = row as Member;
          if (r.is_manager) types.push('經理人');
          if (r.is_member) types.push('正職');
          if (r.is_intern) types.push('工讀生');
          if (r.is_consultant) types.push('顧問');
          if (r.is_outsourcing) types.push('外包');
          return types.join('/');
        }
      },
    ],
  }), []);

  /**
   * 處理表單提交
   */
  const handleFormSubmit = async (data: MemberFormData & { emp_id: string }) => {
    try {
      if (editingEmployee) {
        await updateEmployee(editingEmployee.emp_id, data);
      } else {
        await addEmployee(data);
      }
    } catch (e) {
      // 錯誤已在 hook 中處理
      console.error('表單提交失敗:', e);
    }
  };

  /**
   * 處理刪除
   */
  const handleDelete = async (empId: string) => {
    try {
      await deleteEmployee(empId);
    } catch (e) {
      console.error('刪除失敗:', e);
    }
  };

  /**
   * 處理匯出
   */
  const handleExport = useCallback(async (format: ExportFormat) => {
    switch (format) {
      case 'preview-pdf':
        await previewPdf(allEmployees, employeeExportConfig);
        break;
      case 'pdf':
        await downloadPdf(allEmployees, employeeExportConfig);
        break;
      case 'csv':
        downloadCsv(allEmployees, employeeExportConfig);
        break;
      case 'xlsx':
        downloadXlsx(allEmployees, employeeExportConfig);
        break;
    }
  }, [allEmployees, employeeExportConfig, previewPdf, downloadPdf, downloadCsv, downloadXlsx]);

  return (
    <div className="app">
      {/* 頁首 */}
      <header className="app-header">
        <div className="header-content">
          <div className="header-title">
            <h1>👥 部門人員管理</h1>
            <p className="header-subtitle">Employee Management System</p>
          </div>
          <div className="header-actions">
            <button
              className="btn btn-outline"
              onClick={refresh}
              disabled={isLoading}
            >
              🔄 重新載入
            </button>
            <ExportDropdown
              onExport={handleExport}
              isGenerating={isGenerating}
              disabled={allEmployees.length === 0}
            />
          </div>
        </div>
      </header>

      {/* 錯誤提示 */}
      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => refresh()}>重試</button>
        </div>
      )}

      {/* 主要內容 */}
      <main className="app-main">
        <div className="container">
          {/* 員工表單 */}
          <section className="section">
            <EmployeeForm
              editingEmployee={editingEmployee}
              divisions={divisions}
              onSubmit={handleFormSubmit}
              onCancel={cancelEdit}
            />
          </section>

          {/* 搜尋與篩選 */}
          <section className="section">
            <div className="section-header">
              <h2 className="section-title">
                員工清單
                <span className="badge-count">{totalCount}</span>
              </h2>
            </div>
            <SearchBar
              searchTerm={searchTerm}
              departmentFilter={departmentFilter}
              memberTypeFilter={memberTypeFilter}
              isEmployedFilter={isEmployedFilter}
              divisions={divisions}
              onSearchChange={setSearchTerm}
              onDepartmentChange={setDepartmentFilter}
              onMemberTypeChange={setMemberTypeFilter}
              onIsEmployedChange={setIsEmployedFilter}
            />
          </section>

          {/* 員工列表 */}
          <section className="section">
            <EmployeeTable
              employees={employees}
              onEdit={startEdit}
              onDelete={handleDelete}
              isLoading={isLoading}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
            />
            {!isLoading && employees.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalCount={totalCount}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
              />
            )}
          </section>
        </div>
      </main>

      {/* 頁尾 */}
      <footer className="app-footer">
        <p>© 2026 部門人員管理系統 · 使用 React + TypeScript + FastAPI 構建</p>
      </footer>

      {/* PDF 預覽模態框 */}
      <PdfPreview
        isOpen={isPreviewOpen}
        pdfDataUrl={pdfDataUrl}
        onClose={closePreview}
        onDownload={() => downloadPdf(allEmployees, employeeExportConfig)}
      />
    </div>
  );
}

export default App;
