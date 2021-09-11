import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import Header from '../../components/Header';
import Prismic from '@prismicio/client'
import Link from 'next/link';

import { getPrismicClient } from '../../services/prismic';

import { FiCalendar, FiClock, FiUser } from 'react-icons/fi'

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';
import { RichText } from 'prismic-dom';
import { useRouter } from 'next/router';

interface Post {
  uid: string;
  first_publication_date: string | null;
  last_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface NeighborhoodPost {
  title: string;
  uid: string
}

interface PostProps {
  post: Post;
  preview: boolean;
  nextPost: NeighborhoodPost;
  previousPost: NeighborhoodPost;
}

export default function Post({
  post,
  preview,
  nextPost,
  previousPost
}: PostProps): JSX.Element {
  const router = useRouter();

  if (router.isFallback) {
    return <div>Carregando...</div>;
  }

  const amountWordsOfBody = RichText.asText(
    post.data.content.reduce((acc, data) => [...acc, ...data.body], [])
  ).split(' ').length;

  const amountWordsOfHeading = post.data.content.reduce((acc, data) => {
    if (data.heading) {
      return [...acc, ...data.heading.split(' ')];
    }

    return [...acc];
  }, []).length;

  const readingTime = Math.ceil(
    (amountWordsOfBody + amountWordsOfHeading) / 200
  );

  return (
    <>
      <Head>
        <title> {post.data.title} | Space Traveling </title>
      </Head>

      <Header />

      <main className={styles.container}>
        {post.data.banner.url && (
          <div className={styles.banner}>
            <img src={post.data.banner.url} alt={post.data.title} />
          </div>
        )}

        <div className={commonStyles.headerContent}>
          <h1>{post.data.title}</h1>
          <div className={styles.authorAndCalendar}>
            <span>
              <FiCalendar color="#dddddd"/>
              {format(new Date(post.first_publication_date), "dd MMM yyyy", { locale: ptBR })}
            </span>
            <span><FiUser color="#dddddd"/> {post.data.author}</span>
            <span><FiClock color="#dddddd"/> {readingTime} min</span>
          </div>

          <span>
            {format(
              new Date(post.last_publication_date),
              "'*editado em' dd MMM yyyy', às' HH:mm",
              {
                locale: ptBR
              }
            )}
          </span>

          <div className={styles.post}>
            {post.data.content.map(({ heading, body }) => (
              <div key={heading}>
                <h3>{heading}</h3>
                <div
                  className={styles.postSection}
                  // eslint-disable-next-line react/no-danger
                  dangerouslySetInnerHTML={{ __html: RichText.asText(body) }}
                />
              </div>
            ))}
          </div>
        </div>

        <aside className={styles.footer}>
          <div>
            {previousPost && (
              <>
                <p>{previousPost.title}</p>
                <Link href={`/post/${previousPost.uid}`}>
                  <a>Post anterior</a>
                </Link>
              </>
            )}
          </div>

          <div>
            {nextPost && (
              <>
                <p>{nextPost.title}</p>
                <Link href={`/post/${nextPost.uid}`}>
                  <a>Próximo post</a>
                </Link>
              </>
            )}
          </div>
        </aside>
      </main>
    </>
  )
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();

  const posts = await prismic.query([
    Prismic.predicates.at('document.type', 'posts')
  ], {
    pageSize: 3
  });

  const paths = posts.results.map(result => {
    return {
      params: {
        slug: result.uid,
      }
    }
  })

  return {
    paths,
    fallback: true
  }
};

function verifyNeighborhoodPost(post, slug): NeighborhoodPost | null {
  return slug === post.results[0].uid
    ? null
    : {
      title: post.results[0]?.data?.title,
      uid: post.results[0]?.uid
    }
}

export const getStaticProps: GetStaticProps<PostProps> = async ({params, preview = false}) => {
  const { slug } = params

  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', String(slug), {});

  const responsePreviousPost = await prismic.query(
    Prismic.Predicates.at('document.type', 'posts'),
    {
      pageSize: 1,
      after: slug,
      orderings: '[documet.first_publication_date desc]',
    }
  )

  const responseNextPost = await prismic.query(
    Prismic.Predicates.at('document.type', 'posts'),
    { pageSize: 1, after: slug, orderings: '[document.first_publication_date]' }
  )

  const nextPost = verifyNeighborhoodPost(responseNextPost, slug)

  const previousPost = verifyNeighborhoodPost(responsePreviousPost, slug)

  const post: Post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    last_publication_date: response.last_publication_date,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      banner: response.data.banner,
      author: response.data.author,
      content: response.data.content
    }
  }

  return {
    props: {
      post,
      preview,
      nextPost,
      previousPost
    },
    revalidate: 60 * 30 // 30 min
  }
};
