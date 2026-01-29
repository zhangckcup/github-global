// 文件名翻译模块
// 将非英文文件名翻译为英文

/**
 * 常见中文文件名到英文的映射表
 * 用于快速翻译常见的文件名，避免调用 AI API
 */
const FILENAME_MAPPING: Record<string, string> = {
  // 常见文档名
  '自述文件': 'README',
  '说明': 'README',
  '介绍': 'Introduction',
  '简介': 'Introduction',
  '概述': 'Overview',
  '概览': 'Overview',
  '入门': 'Getting-Started',
  '快速开始': 'Quick-Start',
  '快速入门': 'Quick-Start',
  '安装': 'Installation',
  '安装指南': 'Installation-Guide',
  '使用': 'Usage',
  '使用指南': 'Usage-Guide',
  '使用说明': 'Usage-Guide',
  '教程': 'Tutorial',
  '指南': 'Guide',
  '配置': 'Configuration',
  '配置说明': 'Configuration-Guide',
  '常见问题': 'FAQ',
  '问题': 'FAQ',
  '更新日志': 'CHANGELOG',
  '变更日志': 'CHANGELOG',
  '变更记录': 'CHANGELOG',
  '贡献': 'Contributing',
  '贡献指南': 'Contributing-Guide',
  '许可证': 'LICENSE',
  '协议': 'LICENSE',
  '作者': 'Authors',
  '维护者': 'Maintainers',
  '致谢': 'Acknowledgments',
  '鸣谢': 'Acknowledgments',
  '参考': 'Reference',
  '参考文档': 'Reference',
  '文档': 'Documentation',
  '接口': 'API',
  '接口文档': 'API-Documentation',
  '开发': 'Development',
  '开发指南': 'Development-Guide',
  '部署': 'Deployment',
  '部署指南': 'Deployment-Guide',
  '架构': 'Architecture',
  '设计': 'Design',
  '设计文档': 'Design-Document',
  '规范': 'Specification',
  '标准': 'Standard',
  '测试': 'Testing',
  '测试指南': 'Testing-Guide',
  '安全': 'Security',
  '安全指南': 'Security-Guide',
  '性能': 'Performance',
  '优化': 'Optimization',
  '示例': 'Examples',
  '案例': 'Examples',
  '样例': 'Examples',
  '附录': 'Appendix',
  '术语表': 'Glossary',
  '词汇表': 'Glossary',
  '索引': 'Index',
  '目录': 'Table-of-Contents',
  '路线图': 'Roadmap',
  '计划': 'Roadmap',
  '版本': 'Version',
  '发布': 'Release',
  '发布说明': 'Release-Notes',
  '备注': 'Notes',
  '笔记': 'Notes',
  '总结': 'Summary',
  '摘要': 'Summary',
  '背景': 'Background',
  '历史': 'History',
  '对比': 'Comparison',
  '比较': 'Comparison',
  '功能': 'Features',
  '特性': 'Features',
  '需求': 'Requirements',
  '依赖': 'Dependencies',
  '兼容性': 'Compatibility',
  '迁移': 'Migration',
  '迁移指南': 'Migration-Guide',
  '升级': 'Upgrade',
  '升级指南': 'Upgrade-Guide',
  
  // 编程相关
  '编程': 'Programming',
  '编程导航': 'Programming-Navigation',
  '编程学习': 'Programming-Learning',
  '学习': 'Learning',
  '学习路线': 'Learning-Path',
  '知识': 'Knowledge',
  '知识体系': 'Knowledge-System',
  '知识库': 'Knowledge-Base',
  '资源': 'Resources',
  '资源汇总': 'Resource-Collection',
  '工具': 'Tools',
  '工具推荐': 'Recommended-Tools',
  '框架': 'Framework',
  '库': 'Library',
  '项目': 'Project',
  '项目介绍': 'Project-Introduction',
  '项目说明': 'Project-Description',
};

/**
 * 检查文件名是否包含非 ASCII 字符（如中文、日文等）
 */
function containsNonAscii(str: string): boolean {
  // eslint-disable-next-line no-control-regex
  return /[^\x00-\x7F]/.test(str);
}

/**
 * 将中文文件名翻译为英文
 * 使用本地映射表，如果没有匹配则返回原文件名（后续可以扩展为调用 AI）
 */
export function translateFilename(originalPath: string): string {
  // 分离路径和文件名
  const parts = originalPath.split('/');
  const filename = parts[parts.length - 1];
  
  // 分离文件名和扩展名
  const lastDotIndex = filename.lastIndexOf('.');
  const nameWithoutExt = lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;
  const extension = lastDotIndex > 0 ? filename.substring(lastDotIndex) : '';
  
  // 如果文件名不包含非 ASCII 字符，直接返回原路径
  if (!containsNonAscii(nameWithoutExt)) {
    return originalPath;
  }
  
  // 尝试从映射表中查找翻译
  let translatedName = FILENAME_MAPPING[nameWithoutExt];
  
  if (!translatedName) {
    // 尝试部分匹配：查找是否有映射表中的词作为文件名的一部分
    for (const [chinese, english] of Object.entries(FILENAME_MAPPING)) {
      if (nameWithoutExt.includes(chinese)) {
        translatedName = nameWithoutExt.replace(chinese, english);
        break;
      }
    }
  }
  
  // 如果仍然没有找到翻译，使用拼音转换或保持原样
  // 这里我们选择保持原样，因为调用 AI 翻译文件名可能成本过高
  if (!translatedName || containsNonAscii(translatedName)) {
    // 将非 ASCII 字符替换为连字符，保留英文和数字
    translatedName = nameWithoutExt
      .replace(/[^\x00-\x7F]+/g, '-')
      .replace(/^-+|-+$/g, '') // 去除首尾连字符
      .replace(/-+/g, '-'); // 合并多个连字符
    
    // 如果全部被替换了，使用通用名称
    if (!translatedName || translatedName === '-') {
      translatedName = 'document';
    }
  }
  
  // 构建新的文件路径
  const newFilename = translatedName + extension;
  parts[parts.length - 1] = newFilename;
  
  // 同样处理路径中的目录名
  return parts.map((part, index) => {
    if (index === parts.length - 1) {
      return newFilename;
    }
    // 对目录名也进行翻译
    if (containsNonAscii(part)) {
      return FILENAME_MAPPING[part] || part.replace(/[^\x00-\x7F]+/g, '-').replace(/^-+|-+$/g, '').replace(/-+/g, '-') || 'folder';
    }
    return part;
  }).join('/');
}

/**
 * 获取翻译后的目标路径
 * @param sourcePath 源文件路径
 * @param targetLang 目标语言
 * @param baseLanguage 基准语言
 * @returns 翻译后的目标路径
 */
export function getTranslatedPath(
  sourcePath: string,
  targetLang: string,
  baseLanguage: string
): string {
  // 基准语言保持原文件名
  // 其他语言翻译为英文文件名
  const translatedPath = targetLang === baseLanguage 
    ? sourcePath 
    : translateFilename(sourcePath);
  
  return `translations/${targetLang}/${translatedPath}`;
}
