import { Metadata } from 'next';
import { fetchArticle } from '@/services/article';
import ArticleDetailsPreviewClient from './ArticleDetailsPreviewClient';

interface ArticleDetailsPreviewPageProps {
  params: {
    id: string;
  };
}

export const dynamic = 'force-static';

export async function generateMetadata({ params }: ArticleDetailsPreviewPageProps): Promise<Metadata> {
  try {
    // Vérifier si nous avons un ID factice
    if (params.id === 'no-articles-found') {
      return {
        title: `Aucun article - Aperçu | ${process.env.NEXT_PUBLIC_JOURNAL_NAME}`,
        description: "Page placeholder pour l'aperçu d'articles"
      };
    }
    
    const article = await fetchArticle(params.id);
    return {
      title: article?.title ? `${article.title} - Prévisualisation` : 'Article non trouvé',
    };
  } catch (error) {
    console.error(`Erreur lors de la récupération des métadonnées de l'article ${params.id}:`, error);
    return {
      title: 'Erreur - Prévisualisation',
    };
  }
}

export default async function ArticleDetailsPreviewPage({ params }: ArticleDetailsPreviewPageProps) {
  try {
    // Vérifier si nous avons un ID factice
    if (params.id === 'no-articles-found') {
      return {
        title: `Aucun article - Aperçu | ${process.env.NEXT_PUBLIC_JOURNAL_NAME}`,
        description: "Page placeholder pour l'aperçu d'articles"
      };
    }
    
    const article = await fetchArticle(params.id);
    return <ArticleDetailsPreviewClient article={article} />;
  } catch (error) {
    console.error(`Erreur lors de la récupération de l'article ${params.id} pour la prévisualisation:`, error);
    return (
      <div className="error-message">
        <h1>Erreur lors du chargement de la prévisualisation</h1>
        <p>Impossible de charger les données de l'article pour la prévisualisation.</p>
      </div>
    );
  }
} 