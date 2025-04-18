import type { Metadata } from 'next';
import { fetchArticles } from '@/services/article';
import ArticlesAcceptedClient from './ArticlesAcceptedClient';
import { IArticle } from '@/types/article';

// Métadonnées pour la page
export const metadata: Metadata = {
  title: 'Articles acceptés',
  description: 'Articles acceptés',
};

export default async function ArticlesAcceptedPage() {
  try {
    const ARTICLES_ACCEPTED_PER_PAGE = 10;
    
    // Récupération statique des articles acceptés pendant le build
    const articlesAccepted = await fetchArticles({
      rvcode: process.env.NEXT_PUBLIC_JOURNAL_CODE || '',
      page: 1,
      itemsPerPage: ARTICLES_ACCEPTED_PER_PAGE,
      onlyAccepted: true,
      types: []
    });

    // S'assurer que les données sont correctement formatées pour le client
    const formattedArticles = {
      data: Array.isArray(articlesAccepted.data) ? articlesAccepted.data : [],
      totalItems: articlesAccepted.totalItems || 0,
      range: {
        // Vérification explicite de l'existence des types dans range
        types: articlesAccepted.range && 'types' in articlesAccepted.range 
          ? Array.isArray(articlesAccepted.range.types) 
            ? articlesAccepted.range.types 
            : []
          : [],
        years: articlesAccepted.range && Array.isArray(articlesAccepted.range.years) 
          ? articlesAccepted.range.years 
          : []
      }
    };

    return (
      <ArticlesAcceptedClient 
        initialArticles={formattedArticles} 
        initialRange={formattedArticles.range}
      />
    );
  } catch (error) {
    console.error('Error fetching articles accepted:', error);
    // Retourner un état vide en cas d'erreur
    return (
      <ArticlesAcceptedClient 
        initialArticles={{ data: [], totalItems: 0 }} 
        initialRange={{ types: [], years: [] }}
      />
    );
  }
} 