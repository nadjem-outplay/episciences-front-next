"use client";

import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { MathJax } from 'better-react-mathjax';
import { useRouter } from 'next/navigation';
import { Link } from '@/components/Link/Link';
import { isMobileOnly } from "react-device-detect";

import caretUpGrey from '/public/icons/caret-up-grey.svg';
import caretDownGrey from '/public/icons/caret-down-grey.svg';
import caretUpRed from '/public/icons/caret-up-red.svg';
import caretDownRed from '/public/icons/caret-down-red.svg';
import orcid from '/public/icons/orcid.svg';
import { PATHS, BREADCRUMB_PATHS } from '@/config/paths';
import { useAppSelector } from "@/hooks/store";
import { IArticle, IArticleAuthor, IArticleRelatedItem } from "@/types/article";
import { IVolume } from "@/types/volume";
import { articleTypes, CITATION_TEMPLATE, getCitations, ICitation, METADATA_TYPE } from '@/utils/article';
import { AvailableLanguage } from '@/utils/i18n';
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Loader from "@/components/Loader/Loader";
import ArticleMeta from "@/components/Meta/ArticleMeta/ArticleMeta";
import ArticleDetailsSidebar from "@/components/Sidebars/ArticleDetailsSidebar/ArticleDetailsSidebar";
import CollapsibleSection from './components/CollapsibleSection';
import CollapsibleInstitutions from './components/CollapsibleInstitutions';
import KeywordsSection from './components/KeywordsSection';
import LinkedPublicationsSection from './components/LinkedPublicationsSection';
import CitedBySection from './components/CitedBySection';
import ReferencesSection from './components/ReferencesSection';
import PreviewSection from './components/PreviewSection';
import { fetchVolume } from '@/services/volume';
import { fetchArticleMetadata } from '@/services/article';
import './ArticleDetails.scss';

interface ArticleDetailsClientProps {
  article: IArticle | null;
  id: string;
}

interface EnhancedArticleAuthor extends IArticleAuthor {
  institutionsKeys: number[];
}

enum ARTICLE_SECTION {
  GRAPHICAL_ABSTRACT = 'graphicalAbstract',
  ABSTRACT = 'abstract',
  KEYWORDS = 'keywords',
  REFERENCES = 'references',
  LINKED_PUBLICATIONS = 'linkedPublications',
  CITED_BY = 'citedBy',
  PREVIEW = 'preview'
}

const MAX_BREADCRUMB_TITLE = 20;

export default function ArticleDetailsClient({ article, id }: ArticleDetailsClientProps): JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const language = useAppSelector(state => state.i18nReducer.language);
  const rvcode = useAppSelector(state => state.journalReducer.currentJournal?.code);
  const currentJournal = useAppSelector(state => state.journalReducer.currentJournal);
  
  const [relatedVolume, setRelatedVolume] = useState<IVolume | undefined>(undefined);
  const [metadataCSL, setMetadataCSL] = useState<string | null>(null);
  const [metadataBibTeX, setMetadataBibTeX] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [openedSections, setOpenedSections] = useState<{ key: ARTICLE_SECTION, isOpened: boolean }[]>([
    { key: ARTICLE_SECTION.GRAPHICAL_ABSTRACT, isOpened: true },
    { key: ARTICLE_SECTION.ABSTRACT, isOpened: true },
    { key: ARTICLE_SECTION.KEYWORDS, isOpened: true },
    { key: ARTICLE_SECTION.REFERENCES, isOpened: true },
    { key: ARTICLE_SECTION.LINKED_PUBLICATIONS, isOpened: true },
    { key: ARTICLE_SECTION.CITED_BY, isOpened: true },
    { key: ARTICLE_SECTION.PREVIEW, isOpened: true }
  ]);
  const [authors, setAuthors] = useState<EnhancedArticleAuthor[]>([]);
  const [institutions, setInstitutions] = useState<string[]>([]);
  const [citations, setCitations] = useState<ICitation[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        
        // Si nous sommes en mode statique, ne pas effectuer d'appels API
        if (process.env.NEXT_PUBLIC_STATIC_BUILD === 'true') {
          setIsLoading(false);
          return;
        }
        
        if (article?.volumeId && rvcode) {
          const volumeData = await fetchVolume({ 
            rvcode, 
            vid: article.volumeId.toString(), 
            language 
          });
          setRelatedVolume(volumeData || undefined);
        }
        if (id && rvcode) {
          const [cslData, bibtexData] = await Promise.all([
            fetchArticleMetadata({ rvcode, paperid: id, type: METADATA_TYPE.CSL }),
            fetchArticleMetadata({ rvcode, paperid: id, type: METADATA_TYPE.BIBTEX })
          ]);
          setMetadataCSL(cslData);
          setMetadataBibTeX(bibtexData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [article, id, rvcode, language]);

  useEffect(() => {
    if (article && !authors.length && !institutions.length) {
      const allAuthors: EnhancedArticleAuthor[] = [];
      const allInstitutionsSet = new Set<string>();

      article.authors.forEach((author) => {
        const enhancedAuthor: EnhancedArticleAuthor = { ...author, institutionsKeys: [] };
  
        author.institutions?.forEach((institution) => {
          if (!allInstitutionsSet.has(institution)) {
            allInstitutionsSet.add(institution);
          }
  
          const institutionIndex = Array.from(allInstitutionsSet).indexOf(institution);
          enhancedAuthor.institutionsKeys.push(institutionIndex);
        });
  
        allAuthors.push(enhancedAuthor);
      });

      setAuthors(allAuthors)
      setInstitutions(Array.from(allInstitutionsSet))
    }
  }, [article, authors, institutions])

  const renderArticleTitleAndAuthors = (isMobile: boolean): JSX.Element => {
    return (
      <>
        <h1 className={`articleDetails-content-article-title ${isMobile && 'articleDetails-content-article-title-mobile'}`}>
          <MathJax dynamic>{article?.title}</MathJax>
        </h1>
        {authors.length > 0 && (
          <CollapsibleInstitutions 
            authors={authors} 
            institutions={institutions} 
            isMobile={isMobile} 
          />
        )}
      </>
    )
  }

  const renderSection = (sectionKey: ARTICLE_SECTION, sectionTitle: string, sectionContent: JSX.Element | null): JSX.Element | null => {
    if (!sectionContent) return null

    const isOpenedSection = openedSections.find(section => section.key === sectionKey)?.isOpened

    return (
      <div className='articleDetails-content-article-section'>
        <div className={`articleDetails-content-article-section-title ${!isOpenedSection && 'articleDetails-content-article-section-closed'}`} onClick={(): void => toggleSection(sectionKey)}>
          <div className='articleDetails-content-article-section-title-text'>{sectionTitle}</div>
          {isOpenedSection ? (
            <img className='articleDetails-content-article-section-title-caret' src={caretUpRed} alt='Caret up icon' />
          ) : (
            <img className='articleDetails-content-article-section-title-caret' src={caretDownRed} alt='Caret down icon' />
          )}
        </div>
        <div className={`articleDetails-content-article-section-content ${isOpenedSection && 'articleDetails-content-article-section-content-opened'}`}>{sectionContent}</div>
      </div>
    )
  }

  const toggleSection = (sectionKey: ARTICLE_SECTION) => {
    const updatedSections = openedSections.map((section) => {
      if (section.key === sectionKey) {
        return { ...section, isOpened: !section.isOpened };
      }
      return { ...section };
    });

    setOpenedSections(updatedSections);
  }

  const getGraphicalAbstractSection = (): JSX.Element | null => {
    const graphicalAbstractURL = (rvcode && article?.graphicalAbstract) ? `https://${rvcode}.episciences.org/public/documents/${article.id}/${article?.graphicalAbstract}` : null
    
    return graphicalAbstractURL ? <img src={graphicalAbstractURL} className="articleDetails-content-article-section-content-graphicalAbstract" /> : null
  }

  const getAbstractSection = (): JSX.Element | null => {
    return article?.abstract ? <MathJax dynamic>{article.abstract}</MathJax> : null
  }

  const getKeywordsSection = (): JSX.Element | null => {
    return article?.keywords ? (
      <KeywordsSection 
        keywordsData={article.keywords} 
        currentLanguage={language as AvailableLanguage} 
      />
    ) : null;
  }

  const getLinkedPublicationsSection = (): JSX.Element | null => {
    return article?.relatedItems ? (
      <LinkedPublicationsSection relatedItems={article.relatedItems} />
    ) : null;
  }

  const getReferencesSection = (): JSX.Element | null => {
    return article?.references ? (
      <ReferencesSection references={article.references} />
    ) : null;
  }

  const getCitedBySection = (): JSX.Element | null => {
    return article?.citedBy ? (
      <CitedBySection citedBy={article.citedBy} />
    ) : null;
  }

  const getPreviewSection = (): JSX.Element | null => {
   // console.log('Article object:', article);
   // console.log('PDF Link:', article?.pdfLink);
    return article?.pdfLink ? (
      <PreviewSection 
        pdfLink={article.pdfLink} 
      />
    ) : null;
  }

  const renderMetrics = (): JSX.Element | undefined => {
    if (article?.metrics && (article.metrics.views > 0 || article.metrics.downloads > 0)) {
      return (
        <div className="articleDetailsSidebar-metrics">
          <div className="articleDetailsSidebar-metrics-title">{t('pages.articleDetails.metrics.title')}</div>
          <div className="articleDetailsSidebar-metrics-data">
            <div className="articleDetailsSidebar-metrics-data-row">
              <div className="articleDetailsSidebar-metrics-data-row-number">{article.metrics.views}</div>
              <div className="articleDetailsSidebar-metrics-data-row-text">{t('pages.articleDetails.metrics.views')}</div>
            </div>
            <div className="articleDetailsSidebar-metrics-data-divider"></div>
            <div className="articleDetailsSidebar-metrics-data-row">
              <div className="articleDetailsSidebar-metrics-data-row-number">{article.metrics.downloads}</div>
              <div className="articleDetailsSidebar-metrics-data-row-text">{t('pages.articleDetails.metrics.downloads')}</div>
            </div>
          </div>
        </div>
      )
    }

    return;
  }

  useEffect(() => {
    const fetchCitations = async () => {
      const fetchedCitations = await getCitations(metadataCSL as string);
      fetchedCitations.push({
        key: CITATION_TEMPLATE.BIBTEX,
        citation: metadataBibTeX as string
      })

      setCitations(fetchedCitations);
    };

    fetchCitations();
  }, [metadataCSL, metadataBibTeX]);

  return (
    <main className='articleDetails'>
      <Breadcrumb 
        parents={[
          { path: BREADCRUMB_PATHS.home, label: `${t('pages.home.title')} > ${t('common.content')} >` },
          { path: BREADCRUMB_PATHS.articles, label: `${t('pages.articles.title')} >` }
        ]} 
        crumbLabel={article?.title.length ? article.title.length > MAX_BREADCRUMB_TITLE ? `${article.title.substring(0, MAX_BREADCRUMB_TITLE)} ...` : article.title : ''} 
      />
      {isLoading ? (
        <Loader />
      ) : (
        <>
          <ArticleMeta 
            language={language} 
            article={article as IArticle | undefined} 
            currentJournal={currentJournal} 
            keywords={Array.isArray(article?.keywords) ? article.keywords : []} 
            authors={authors} 
          />
          {article?.tag && <div className='articleDetails-tag'>{t(articleTypes.find((tag) => tag.value === article.tag)?.labelPath!)}</div>}
          <div className="articleDetails-content">
            {renderArticleTitleAndAuthors(true)}
            <ArticleDetailsSidebar language={language} t={t} article={article as IArticle | undefined} relatedVolume={relatedVolume} citations={citations} metrics={renderMetrics()} />
            <div className="articleDetails-content-article">
              {renderArticleTitleAndAuthors(false)}
              {renderSection(ARTICLE_SECTION.GRAPHICAL_ABSTRACT, t('pages.articleDetails.sections.graphicalAbstract'), getGraphicalAbstractSection())}
              {renderSection(ARTICLE_SECTION.ABSTRACT, t('pages.articleDetails.sections.abstract'), getAbstractSection())}
              {renderSection(ARTICLE_SECTION.KEYWORDS, t('pages.articleDetails.sections.keywords'), getKeywordsSection())}
              {renderSection(ARTICLE_SECTION.LINKED_PUBLICATIONS, t('pages.articleDetails.sections.linkedPublications'), getLinkedPublicationsSection())}
              {renderSection(ARTICLE_SECTION.CITED_BY, t('pages.articleDetails.sections.citedBy'), getCitedBySection())}
              {renderSection(ARTICLE_SECTION.REFERENCES, t('pages.articleDetails.sections.references'), getReferencesSection())}
              {renderSection(ARTICLE_SECTION.PREVIEW, t('pages.articleDetails.sections.preview'), getPreviewSection())}
              {isMobileOnly && renderMetrics()}
            </div>
          </div>
        </>
      )}
    </main>
  )
}