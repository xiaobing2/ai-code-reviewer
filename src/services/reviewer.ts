/**
 * 代码审查服务
 */

export interface ReviewRequest {
  code: string
  language?: string
}

export interface ReviewResponse {
  score: number
  level: '优秀' | '良好' | '需改进' | '不合格'
  issues: Array<{
    type: 'error' | 'warning' | 'suggestion'
    line?: number
    message: string
    suggestion?: string
  }>
  summary: string
  suggestions: string[]
}

const EDGE_FUNCTION_URL = import.meta.env.VITE_EDGE_FUNCTION_URL || ''
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true' || !EDGE_FUNCTION_URL

function mockReview(data: ReviewRequest): Promise<ReviewResponse> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const lines = data.code.split('\n').length
      let score = 70 + Math.floor(Math.random() * 25)
      if (lines < 10) score = 50 + Math.floor(Math.random() * 30)
      
      let level: ReviewResponse['level'] = '需改进'
      if (score >= 90) level = '优秀'
      else if (score >= 80) level = '良好'
      else if (score < 60) level = '不合格'

      resolve({
        score,
        level,
        issues: [
          { type: 'warning', line: 5, message: '建议添加错误处理', suggestion: '使用 try-catch 包裹可能出错的代码' },
          { type: 'suggestion', line: 12, message: '可以优化变量命名', suggestion: '使用更具描述性的变量名' }
        ],
        summary: `代码整体${level}，共 ${lines} 行。建议关注代码规范和错误处理。`,
        suggestions: [
          '添加适当的注释说明',
          '优化代码结构，提高可读性',
          '考虑添加单元测试'
        ]
      })
    }, 1500)
  })
}

export async function submitReview(data: ReviewRequest): Promise<ReviewResponse> {
  // 获取用户配置的密钥
  const saved = localStorage.getItem('aliyun_accesskey')
  let accessKeySecret = ''
  
  if (saved) {
    try {
      const config = JSON.parse(saved)
      accessKeySecret = config.accessKeySecret || ''
    } catch (e) {
      console.error('读取密钥配置失败:', e)
    }
  }

  // 如果使用模拟模式或边缘函数未配置，使用模拟数据
  if (USE_MOCK || !accessKeySecret) {
    if (!accessKeySecret) {
      console.log('密钥未配置，使用模拟审查结果')
    } else {
      console.log('使用模拟审查结果（开发环境）')
    }
    return await mockReview(data)
  }

  const form = new FormData()
  form.append('code', data.code)
  form.append('language', data.language || 'javascript')
  form.append('accessKeySecret', accessKeySecret)

  try {
    const res = await fetch(EDGE_FUNCTION_URL, { method: 'POST', body: form })
    
    if (!res.ok) {
      if (res.status === 404) {
        console.warn('边缘函数未找到，切换到模拟模式')
        return await mockReview(data)
      }
      throw new Error(`审查失败: ${res.status}`)
    }
    
    return await res.json()
  } catch (error: any) {
    if (error.message?.includes('404') || error.message?.includes('Failed to fetch')) {
      console.warn('边缘函数调用失败，切换到模拟模式:', error.message)
      return await mockReview(data)
    }
    throw error
  }
}
