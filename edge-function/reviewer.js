/**
 * ESA 边缘函数：代码审查代理
 * 调用阿里云 AI 模型进行代码审查
 */

export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    const formData = await request.formData()
    
    // 优先使用请求中的密钥，如果没有则使用环境变量
    let accessKeySecret = formData.get('accessKeySecret') || process.env.ALIYUN_ACCESS_KEY_SECRET
    // AccessKey ID 从环境变量读取
    let accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID

    if (!accessKeyId || !accessKeySecret) {
      throw new Error('阿里云 AccessKey 未配置')
    }

    const code = formData.get('code')
    const language = formData.get('language') || 'javascript'

    if (!code) {
      throw new Error('代码内容不能为空')
    }

    // 调用阿里云通义千问模型进行代码审查
    const result = await reviewCode(code, language, accessKeyId, accessKeySecret)

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('审查失败:', error)
    return new Response(JSON.stringify({
      score: 0,
      level: '不合格',
      issues: [],
      summary: `审查失败: ${error.message}`,
      suggestions: []
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

async function reviewCode(code, language, accessKeyId, accessKeySecret) {
  // 调用阿里云通义千问模型进行代码审查
  // 实际实现需要根据阿里云 API 文档进行调用
  
  // 模拟审查逻辑
  const lines = code.split('\n').length
  let score = 70 + Math.floor(Math.random() * 25)
  if (lines < 10) score = 50 + Math.floor(Math.random() * 30)
  
  let level = '需改进'
  if (score >= 90) level = '优秀'
  else if (score >= 80) level = '良好'
  else if (score < 60) level = '不合格'

  return {
    score,
    level,
    issues: [
      { type: 'warning', line: Math.floor(lines * 0.3), message: '建议添加错误处理', suggestion: '使用 try-catch 包裹可能出错的代码' },
      { type: 'suggestion', line: Math.floor(lines * 0.6), message: '可以优化变量命名', suggestion: '使用更具描述性的变量名' }
    ],
    summary: `代码整体${level}，共 ${lines} 行。建议关注代码规范和错误处理。`,
    suggestions: [
      '添加适当的注释说明',
      '优化代码结构，提高可读性',
      '考虑添加单元测试'
    ]
  }
}
