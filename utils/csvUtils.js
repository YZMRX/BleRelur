/**
 * CSV工具类，提供CSV相关的通用功能
 */
export default {
  /**
   * 生成CSV内容
   * @param {Object} options - 配置选项
   * @param {Object} options.projectInfo - 项目信息对象
   * @param {Object} options.warningSettings - 预警设置对象
   * @param {Boolean} options.showSlope - 是否显示坡度数据
   * @param {Boolean} options.showFlatness - 是否显示平整度数据
   * @param {Function} options.isOverWarning - 判断是否超过预警值的函数
   * @param {Array} options.sections - 房间列表
   * @param {Object} options.sectionData - 房间数据对象
   * @returns {String} 生成的CSV内容
   */
  generateCSVContent(options = {}) {
    const {
      projectInfo = {},
      warningSettings = {},
      showSlope = true,
      showFlatness = true,
      isOverWarning = () => false,
      sections = [],
      sectionData = {}
    } = options;
    
    let csvContent = '';
    
    // 添加项目信息行
    const projectHeaders = [
      '项目名称',
      '项目地址',
      '验收日期',
      '栋',
      '单元',
      '楼层',
      '房号',
      '项目类型',
      '验收类型',
      '验收状态',
      '项目质检员'
    ];
    csvContent += projectHeaders.join(',') + '\n';
    
    const projectValues = [
      `"${projectInfo.title || ''}"`,
      `"${projectInfo.address || ''}"`,
      `"${projectInfo.date || ''}"`,
      `"${projectInfo.building || ''}"`,
      `"${projectInfo.unit || ''}"`,
      `"${projectInfo.floor || ''}"`,
      `"${projectInfo.room_number || ''}"`,
      `"${projectInfo.type_tag || ''}"`,
      `"${projectInfo.project_status || ''}"`,
      `"${projectInfo.inspection_status || ''}"`,
      `"${projectInfo.inspector || ''}"`,
    ];
    csvContent += projectValues.join(',') + '\n';
    
    // 添加预警值信息行
    let warningInfo = '预警值设置：';
    const projectType = projectInfo.project_status;
    if (projectType === '坡度' || projectType === '坡度加平整度') {
      warningInfo += `坡度预警值(mm/M)：${warningSettings.slopeWarning || '未设置'}`;
    }
    if (projectType === '平整度' || projectType === '坡度加平整度') {
      if (warningInfo !== '预警值设置：') warningInfo += '，';
      warningInfo += `平整度预警值(mm)：${warningSettings.flatnessWarning || '未设置'}`;
    }
    csvContent += warningInfo + '\n';
    
    // 根据项目类型设置表头
    let headers = ['房间', '墙体'];
    
    // 根据项目类型决定显示哪些列
    if (projectType === '坡度') {
      headers.push('坡度(mm/M)');
    } else if (projectType === '平整度') {
      headers.push('平整度(mm)');
    } else if (projectType === '坡度加平整度') {
      if (showSlope) headers.push('坡度(mm/M)');
      if (showFlatness) headers.push('平整度(mm)');
    }
    
    // 只在需要时添加预警状态列
    if (headers.length > 2) {
      headers.push('预警状态');
    }
    
    csvContent += headers.join(',') + '\n';
    
    // 遍历所有房间
    sections.forEach(section => {
      const walls = sectionData[section];
      let hasRoomData = false;
      
      if (walls && walls.length > 0) {
        // 遍历房间内的墙体
        walls.forEach(wall => {
          const hasValidData = (projectType === '坡度' && wall.slope) ||
                             (projectType === '平整度' && wall.flatness) ||
                             (projectType === '坡度加平整度' && (
                               (showSlope && wall.slope) || 
                               (showFlatness && wall.flatness)
                             ));
          
          if (hasValidData) {
            hasRoomData = true;
            let row = [
              `"${section}"`,
              `"${wall.name}"`,
            ];
            
            // 根据项目类型添加数据
            if (projectType === '坡度') {
              row.push(`"${wall.slope || ''}"`);
            } else if (projectType === '平整度') {
              row.push(`"${wall.flatness || ''}"`);
            } else if (projectType === '坡度加平整度') {
              if (showSlope) row.push(`"${wall.slope || ''}"`);
              if (showFlatness) row.push(`"${wall.flatness || ''}"`);
            }
            
            // 只在有数据列时添加预警状态
            if (row.length > 2) {
              // 自动生成预警状态
              let warningStatus = '否';
              if (isOverWarning && typeof isOverWarning === 'function') {
                if (projectType === '坡度') {
                  const slopeValue = parseFloat(wall.slope) || 0;
                  const slopeWarning = parseFloat(warningSettings.slopeWarning) || 0;
                  if (slopeValue > slopeWarning && slopeWarning > 0) {
                    warningStatus = '是';
                  }
                } else if (projectType === '平整度') {
                  const flatnessValue = parseFloat(wall.flatness) || 0;
                  const flatnessWarning = parseFloat(warningSettings.flatnessWarning) || 0;
                  if (flatnessValue > flatnessWarning && flatnessWarning > 0) {
                    warningStatus = '是';
                  }
                } else if (projectType === '坡度加平整度') {
                  const slopeValue = parseFloat(wall.slope) || 0;
                  const flatnessValue = parseFloat(wall.flatness) || 0;
                  const slopeWarning = parseFloat(warningSettings.slopeWarning) || 0;
                  const flatnessWarning = parseFloat(warningSettings.flatnessWarning) || 0;
                  if ((showSlope && slopeValue > slopeWarning && slopeWarning > 0) ||
                      (showFlatness && flatnessValue > flatnessWarning && flatnessWarning > 0)) {
                    warningStatus = '是';
                  }
                }
              }
              row.push(`"${warningStatus}"`);
            }
            
            csvContent += row.join(',') + '\n';
          }
        });
      }
      
      // 如果该房间没有任何数据，添加一行显示"暂无数据"
      if (!hasRoomData) {
        let row = [`"${section}"`, `"暂无数据"`];
        // 根据项目类型添加空数据
        if (projectType === '坡度') {
          row.push('""');
        } else if (projectType === '平整度') {
          row.push('""');
        } else if (projectType === '坡度加平整度') {
          if (showSlope) row.push('""');
          if (showFlatness) row.push('""');
        }
        // 只在有数据列时添加预警状态
        if (row.length > 2) {
          row.push('"否"');
        }
        csvContent += row.join(',') + '\n';
      }
    });
    
    return csvContent;
  },
  
  /**
   * 解析CSV内容为表格数据
   * @param {String} csvContent - CSV内容
   * @returns {Object} 解析结果
   */
  parseCSVContent(csvContent) {
    try {
      const rows = csvContent.split('\n')
        .map(row => row.trim())
        .filter(row => row);
      
      // 解析项目基本信息
      const projectHeaders = rows[0].split(',').map(h => h.trim());
      const projectValues = rows[1].split(',').map(v => v.trim().replace(/^"(.*)"$/, '$1'));
      
      // 创建项目信息对象
      const projectInfo = {};
      projectHeaders.forEach((header, index) => {
        projectInfo[header] = projectValues[index] || '';
      });
      
      // 解析预警值设置
      const warningLine = rows[2];
      const warningSettings = {};
      const slopeMatch = warningLine.match(/坡度预警值\(mm\/M\)：(\d+\.?\d*)/);
      const flatnessMatch = warningLine.match(/平整度预警值\(mm\)：(\d+\.?\d*)/);
      
      if (slopeMatch) {
        warningSettings.slopeWarning = slopeMatch[1];
      }
      
      if (flatnessMatch) {
        warningSettings.flatnessWarning = flatnessMatch[1];
      }
      
      // 跳过前三行（项目信息、预警值设置）
      const dataRows = rows.slice(3);
      
      // 获取表头，确定数据结构
      const headers = dataRows[0].split(',').map(h => h.trim().replace(/^"(.*)"$/, '$1'));
      
      // 确定各列的索引位置
      const roomIndex = headers.findIndex(h => h === '房间' || h === '区域');
      const wallIndex = headers.findIndex(h => h === '墙体');
      const slopeIndex = headers.findIndex(h => h === '坡度(mm/M)' || h === '坡度');
      const flatnessIndex = headers.findIndex(h => h === '平整度(mm)' || h === '平整度');
      
      // 根据项目类型过滤表头
      const projectType = projectInfo['验收类型'];
      const filteredHeaders = ['房间', '墙体'];
      
      if (projectType === '坡度') {
        if (slopeIndex !== -1) {
          filteredHeaders.push('坡度(mm/M)');
        }
      } else if (projectType === '平整度') {
        if (flatnessIndex !== -1) {
          filteredHeaders.push('平整度(mm)');
        }
      } else if (projectType === '坡度加平整度') {
        if (slopeIndex !== -1) {
          filteredHeaders.push('坡度(mm/M)');
        }
        if (flatnessIndex !== -1) {
          filteredHeaders.push('平整度(mm)');
        }
      }
      
      // 解析数据行
      const tableData = dataRows.slice(1).map(row => {
        const cells = row.split(',').map(cell => cell.trim().replace(/^"(.*)"$/, '$1'));
        const result = [];
        
        // 添加房间和墙体数据
        if (roomIndex !== -1) result.push(cells[roomIndex]);
        if (wallIndex !== -1) result.push(cells[wallIndex]);
        
        // 根据项目类型添加对应的数据
        if (projectType === '坡度') {
          if (slopeIndex !== -1) result.push(cells[slopeIndex]);
        } else if (projectType === '平整度') {
          if (flatnessIndex !== -1) result.push(cells[flatnessIndex]);
        } else if (projectType === '坡度加平整度') {
          if (slopeIndex !== -1) result.push(cells[slopeIndex]);
          if (flatnessIndex !== -1) result.push(cells[flatnessIndex]);
        }
        
        return result;
      });
      
      return {
        headers: filteredHeaders,
        tableData: tableData,
        projectInfo: projectInfo,
        warningSettings: warningSettings
      };
    } catch (error) {
      console.error('解析CSV内容失败:', error);
      return null;
    }
  },
  
  /**
   * 计算CSV文件大小
   * @param {String} content - CSV内容
   * @returns {String} 格式化后的文件大小
   */
  calculateFileSize(content) {
    // 使用字符串长度来估算文件大小（假设每个字符占用1个字节）
    const bytes = content.length;
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  },
  
  /**
   * 处理CSV内容，确保表头和数据正确对应
   * @param {String} content - 原始CSV内容
   * @returns {String} 处理后的CSV内容
   */
  processCSVContent(content) {
    try {
      const rows = content.split('\n')
        .map(row => row.trim())
        .filter(row => row);
      
      // 前三行保持不变（项目信息、预警设置）
      const headerRows = rows.slice(0, 3);
      
      // 获取表头行和数据行
      const headerRow = rows[3];
      const dataRows = rows.slice(4);
      
      // 重新组合CSV内容
      return [...headerRows, headerRow, ...dataRows].join('\n');
    } catch (error) {
      console.error('处理CSV内容失败:', error);
      return content; // 如果处理失败，返回原始内容
    }
  }
};