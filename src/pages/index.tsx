import { GetStaticProps } from 'next';
import Header from '../components/Header';

import { getPrismicClient } from '../services/prismic';
import Prismic from '@prismicio/client'

import { FiCalendar, FiUser } from 'react-icons/fi'

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import commonStyles from '../styles/common.module.scss';
import styles from './home.module.scss';

import Link from 'next/link'
import { useEffect, useState } from 'react';
import Head from 'next/head';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
}

export default function Home({ postsPagination }: HomeProps): JSX.Element {
  const [posts, setPosts] = useState<Post[]>([])
  const [nextPage, setNextPage] = useState('')

  useEffect(() => {
    setPosts(postsPagination.results)
    setNextPage(postsPagination.next_page)
  }, [postsPagination.results, postsPagination.next_page])

  function handlePagination(): void {
    fetch(nextPage)
      .then(res => res.json())
      .then(data => {
        const formattedData = data.results.map(post => {
          return {
            uid: post.uid,
            first_publication_date: post.first_publication_date,
            data: {
              title: post.data.title,
              subtitle: post.data.subtitle,
              author: post.data.author
            }
          }
        })

        setPosts([...posts, ...formattedData])
        setNextPage(data.next_page)
      })
  }

  return (
    <>
      <Head>
        <title>Home | Space Traveling</title>
      </Head>

      <header className={commonStyles.headerContent}>
        <Link href="/">
          <a>
            <img src="/images/Logo.svg" alt="logo" />
          </a>
        </Link>
      </header>

      <main className={styles.container}>
        <div className={styles.posts}>
          { posts.map(post => (
            <Link key={post.uid} href={`post/${post.uid}`}>
                <a>
                  <h1>{post.data.title}</h1>
                  <p>{post.data.subtitle}</p>
                  <div className={styles.authorAndCalendar}>
                    <span>
                      <FiCalendar color="#dddd"/>
                      {format(new Date(post.first_publication_date), "dd MMM yyyy", { locale: ptBR })}
                    </span>
                    <span><FiUser color="#dddd"/> {post.data.author}</span>
                  </div>
                </a>
            </Link>
          )) }


          { nextPage && (
            <button type="button" onClick={handlePagination}>
              Carregar mais posts
            </button>
          )}
        </div>
      </main>
    </>
  )
}

export const getStaticProps: GetStaticProps<HomeProps> = async () => {
  const prismic = getPrismicClient();
  const postsResponse = await prismic.query([
    Prismic.predicates.at('document.type', 'posts')
  ], {
    fetch: ['posts.title', 'posts.subtitle', 'posts.author'],
    pageSize: 20
  });

  const posts = postsResponse.results.map(post => {
    return {
      uid: post.uid,
      first_publication_date: post.first_publication_date,
      data: {
        title: post.data.title,
        subtitle: post.data.subtitle,
        author: post.data.author
      }
    }
  })

  return {
    props: {
      postsPagination: {
        next_page: postsResponse.next_page,
        results: posts
      }
    }
  }
};
