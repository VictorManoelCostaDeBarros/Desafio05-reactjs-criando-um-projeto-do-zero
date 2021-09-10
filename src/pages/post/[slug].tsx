import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import Header from '../../components/Header';
import Prismic from '@prismicio/client'

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

interface PostProps {
  post: Post;
}

export default function Post({ post }: PostProps): JSX.Element {
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
        <title> Home | Space Traveling </title>
      </Head>

      <Header />

      <main className={styles.container}>
        <div className={styles.banner}>
          <img src={post.data.banner.url} alt={post.data.title} />
        </div>

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

export const getStaticProps: GetStaticProps<PostProps> = async ({params}) => {
  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', String(params.slug), {});

  const post: Post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
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
      post
    },
    revalidate: 60 * 30 // 30 min
  }
};
