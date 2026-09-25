import { TipoProblema, ClassificationResult } from '../types';
import { CLASSIFICATION_KEYWORDS } from '../constants';

export class ClassificationService {
  private static instance: ClassificationService;
  private useApi: boolean = false;
  private apiEndpoint: string = '/clasificacion';

  private constructor() {}

  public static getInstance(): ClassificationService {
    if (!ClassificationService.instance) {
      ClassificationService.instance = new ClassificationService();
    }
    return ClassificationService.instance;
  }

  public setApiMode(enabled: boolean, endpoint?: string): void {
    this.useApi = enabled;
    if (endpoint) {
      this.apiEndpoint = endpoint;
    }
  }

  public async classify(description: string): Promise<ClassificationResult> {
    const normalized = description.toLowerCase().trim();
    
    if (this.useApi) {
      try {
        return await this.classifyViaApi(normalized);
      } catch (error) {
        console.warn('API classification failed, falling back to keyword matching:', error);
      }
    }

    return this.classifyByKeywords(normalized);
  }

  private async classifyViaApi(description: string): Promise<ClassificationResult> {
    const response = await fetch(`${this.apiEndpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ descripcion: description }),
    });

    if (!response.ok) {
      throw new Error(`Classification API error: ${response.status}`);
    }

    return response.json();
  }

  private classifyByKeywords(description: string): ClassificationResult {
    const scores: Record<TipoProblema, number> = {
      [TipoProblema.Fuga]: 0,
      [TipoProblema.FaltaAbastecimiento]: 0,
      [TipoProblema.InstalacionRota]: 0,
      [TipoProblema.UsoIndebido]: 0,
      [TipoProblema.Otro]: 0,
    };

    let totalMatches = 0;

    Object.entries(CLASSIFICATION_KEYWORDS).forEach(([tipo, keywords]) => {
      const tipoProblema = parseInt(tipo) as TipoProblema;
      keywords.forEach((keyword) => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        const matches = (description.match(regex) || []).length;
        if (matches > 0) {
          scores[tipoProblema] += matches;
          totalMatches += matches;
        }
      });
    });

    let bestTipo = TipoProblema.Otro;
    let bestScore = 0;

    Object.entries(scores).forEach(([tipo, score]) => {
      if (score > bestScore) {
        bestScore = score;
        bestTipo = parseInt(tipo) as TipoProblema;
      }
    });

    const confidence = totalMatches > 0 ? Math.min(bestScore / totalMatches, 1) : 0.3;
    const reasoning = this.generateReasoning(bestTipo, bestScore, totalMatches);

    return {
      tipoProblema: bestTipo,
      confidence,
      reasoning,
    };
  }

  private generateReasoning(tipo: TipoProblema, score: number, total: number): string {
    const labels: Record<TipoProblema, string> = {
      [TipoProblema.Fuga]: 'fuga de agua',
      [TipoProblema.FaltaAbastecimiento]: 'falta de abastecimiento',
      [TipoProblema.InstalacionRota]: 'instalación rota',
      [TipoProblema.UsoIndebido]: 'uso indebido',
      [TipoProblema.Otro]: 'otro tipo de problema',
    };

    if (total === 0) {
      return `No se detectaron palabras clave específicas. Clasificado como "${labels[tipo]}" por defecto.`;
    }

    const percentage = Math.round((score / total) * 100);
    return `Clasificado como "${labels[tipo]}" con ${percentage}% de coincidencia en palabras clave detectadas.`;
  }

  public getKeywordsForType(tipo: TipoProblema): string[] {
    return CLASSIFICATION_KEYWORDS[tipo] || [];
  }

  public getAllKeywords(): Record<string, string[]> {
    return { ...CLASSIFICATION_KEYWORDS };
  }
}

export const classificationService = ClassificationService.getInstance();