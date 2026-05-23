import { MarketingWord, MarketingWordLib } from '../types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 营销词检测服务
 * 负责检测内容中的营销敏感词并计算扣分
 */
export class MarketingWordService {
  private wordLib: MarketingWordLib;
  
  // 扣分规则：强词扣15分，中词扣8分，弱词扣3分
  private readonly PENALTY_STRONG = 15;
  private readonly PENALTY_MEDIUM = 8;
  private readonly PENALTY_WEAK = 3;

  constructor() {
    // 加载营销词库
    const wordLibPath = path.join(__dirname, '../../../data/marketing_wordlib.json');
    const wordLibData = fs.readFileSync(wordLibPath, 'utf-8');
    this.wordLib = JSON.parse(wordLibData);
  }

  /**
   * 检测内容中的营销词
   * @param content 待检测内容
   * @returns 营销词命中列表
   */
  public detectMarketingWords(content: string): MarketingWord[] {
    const detectedWords: MarketingWord[] = [];

    // 检测强词
    this.detectWordsByCategory(content, this.wordLib.terms.strong, 'strong', this.PENALTY_STRONG, detectedWords);
    
    // 检测中词
    this.detectWordsByCategory(content, this.wordLib.terms.medium, 'medium', this.PENALTY_MEDIUM, detectedWords);
    
    // 检测弱词
    this.detectWordsByCategory(content, this.wordLib.terms.weak, 'weak', this.PENALTY_WEAK, detectedWords);

    return detectedWords;
  }

  /**
   * 按类别检测词汇
   */
  private detectWordsByCategory(
    content: string,
    words: string[],
    category: 'strong' | 'medium' | 'weak',
    penaltyPerWord: number,
    result: MarketingWord[]
  ): void {
    for (const word of words) {
      const positions: number[] = [];
      let index = 0;

      // 查找所有出现位置
      while ((index = content.indexOf(word, index)) !== -1) {
        positions.push(index);
        index += word.length;
      }

      if (positions.length > 0) {
        result.push({
          word,
          category,
          count: positions.length,
          positions,
          penalty: positions.length * penaltyPerWord
        });
      }
    }
  }

  /**
   * 计算营销语气风险评分
   * @param marketingWords 营销词列表
   * @returns 评分 (0-100)，100分表示无风险
   */
  public calculateMarketingRiskScore(marketingWords: MarketingWord[]): number {
    // 计算总扣分
    const totalPenalty = marketingWords.reduce((sum, word) => sum + word.penalty, 0);
    
    // 从100分开始扣分，最低0分
    const score = Math.max(0, 100 - totalPenalty);
    
    return score;
  }

  /**
   * 生成营销词命中报告
   */
  public generateMarketingWordReport(marketingWords: MarketingWord[]): string {
    if (marketingWords.length === 0) {
      return '✅ 未检测到营销敏感词';
    }

    const strongWords = marketingWords.filter(w => w.category === 'strong');
    const mediumWords = marketingWords.filter(w => w.category === 'medium');
    const weakWords = marketingWords.filter(w => w.category === 'weak');

    let report = '⚠️ 营销词命中情况：\n\n';

    if (strongWords.length > 0) {
      report += `🔴 强营销词（每次扣${this.PENALTY_STRONG}分）：\n`;
      strongWords.forEach(w => {
        report += `  - "${w.word}" 出现 ${w.count} 次，扣 ${w.penalty} 分\n`;
      });
      report += '\n';
    }

    if (mediumWords.length > 0) {
      report += `🟡 中营销词（每次扣${this.PENALTY_MEDIUM}分）：\n`;
      mediumWords.forEach(w => {
        report += `  - "${w.word}" 出现 ${w.count} 次，扣 ${w.penalty} 分\n`;
      });
      report += '\n';
    }

    if (weakWords.length > 0) {
      report += `🟢 弱营销词（每次扣${this.PENALTY_WEAK}分）：\n`;
      weakWords.forEach(w => {
        report += `  - "${w.word}" 出现 ${w.count} 次，扣 ${w.penalty} 分\n`;
      });
    }

    return report;
  }
}
