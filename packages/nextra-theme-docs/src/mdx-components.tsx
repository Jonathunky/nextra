import cn from 'clsx'
import type { NextraMDXContent } from 'nextra'
import { Code, Pre } from 'nextra/components'
import { useMounted } from 'nextra/hooks'
import type { MDXComponents } from 'nextra/mdx'
import type { ComponentProps, ReactElement, ReactNode } from 'react'
import { useEffect, useRef } from 'react'
import {
  Anchor,
  Breadcrumb,
  NavLinks,
  Sidebar,
  SkipNavContent
} from './components'
import type { AnchorProps } from './components/anchor'
import type { DocsThemeConfig } from './constants'
import { useConfig, useSetActiveAnchor, useThemeConfig } from './contexts'
import { useIntersectionObserver, useSlugs } from './contexts/active-anchor'
import { renderComponent } from './utils'

// Anchor links
const createHeading = (
  Tag: `h${2 | 3 | 4 | 5 | 6}`,
  context: { index: number }
) =>
  function Heading({
    children,
    id,
    className,
    ...props
  }: ComponentProps<'h2'>): ReactElement {
    const setActiveAnchor = useSetActiveAnchor()
    const slugs = useSlugs()
    const observer = useIntersectionObserver()
    const obRef = useRef<HTMLAnchorElement>(null)

    useEffect(() => {
      if (!id) return
      const heading = obRef.current
      if (!heading) return
      slugs.set(heading, [id, (context.index += 1)])
      observer?.observe(heading)

      return () => {
        observer?.disconnect()
        slugs.delete(heading)
        setActiveAnchor(f => {
          const ret = { ...f }
          delete ret[id]
          return ret
        })
      }
    }, [id, slugs, observer, setActiveAnchor])

    return (
      <Tag
        className={
          // can be added by footnotes
          className === 'sr-only'
            ? '_sr-only'
            : cn(
                '_font-semibold _tracking-tight _text-slate-900 dark:_text-slate-100',
                {
                  h2: '_mt-10 _border-b _pb-1 _text-3xl _border-neutral-200/70 contrast-more:_border-neutral-400 dark:_border-primary-100/10 contrast-more:dark:_border-neutral-400',
                  h3: '_mt-8 _text-2xl',
                  h4: '_mt-8 _text-xl',
                  h5: '_mt-8 _text-lg',
                  h6: '_mt-8 _text-base'
                }[Tag]
              )
        }
        {...props}
      >
        {children}
        {id && (
          <a
            href={`#${id}`}
            id={id}
            className="subheading-anchor"
            aria-label="Permalink for this section"
            ref={obRef}
          />
        )}
      </Tag>
    )
  }

const EXTERNAL_HREF_REGEX = /https?:\/\//

export const Link = ({ href = '', className, ...props }: AnchorProps) => (
  <Anchor
    href={href}
    newWindow={EXTERNAL_HREF_REGEX.test(href)}
    className={cn(
      '_text-primary-600 _underline _decoration-from-font [text-underline-position:from-font]',
      className
    )}
    {...props}
  />
)

const classes = {
  toc: cn(
    'nextra-toc _order-last max-xl:_hidden _w-64 _shrink-0 print:_hidden'
  ),
  main: cn('_w-full _break-words')
}

function Body({ children }: { children: ReactNode }): ReactElement {
  const config = useConfig()
  const themeConfig = useThemeConfig()
  const mounted = useMounted()
  const {
    activeThemeContext: themeContext,
    activeType,
    activeIndex,
    flatDocsDirectories,
    activePath
  } = config.normalizePagesResult

  if (themeContext.layout === 'raw') {
    return <div className={classes.main}>{children}</div>
  }

  const date =
    themeContext.timestamp && themeConfig.gitTimestamp && config.timestamp
      ? new Date(config.timestamp)
      : null

  const gitTimestampEl =
    // Because a user's time zone may be different from the server page
    mounted && date ? (
      <div className="_mt-12 _mb-8 _block _text-xs _text-gray-500 ltr:_text-right rtl:_text-left dark:_text-gray-400">
        {renderComponent(themeConfig.gitTimestamp, { timestamp: date })}
      </div>
    ) : (
      <div className="_mt-16" />
    )

  const content = (
    <>
      {renderComponent(themeContext.topContent)}
      {children}
      {gitTimestampEl}
      {renderComponent(themeContext.bottomContent)}
      {activeType !== 'page' && themeContext.pagination && (
        <NavLinks
          flatDocsDirectories={flatDocsDirectories}
          currentIndex={activeIndex}
        />
      )}
    </>
  )

  const body = themeConfig.main?.({ children: content }) || content

  if (themeContext.layout === 'full') {
    return (
      <article
        className={cn(
          classes.main,
          'nextra-content _min-h-[calc(100vh-var(--nextra-navbar-height))] _pl-[max(env(safe-area-inset-left),1.5rem)] _pr-[max(env(safe-area-inset-right),1.5rem)]'
        )}
      >
        {body}
      </article>
    )
  }

  return (
    <article
      className={cn(
        classes.main,
        'nextra-content _flex _min-h-[calc(100vh-var(--nextra-navbar-height))] _min-w-0 _justify-center _pb-8 _pr-[calc(env(safe-area-inset-right)-1.5rem)]',
        themeContext.typesetting === 'article' &&
          'nextra-body-typesetting-article'
      )}
    >
      <main className="_w-full _min-w-0 _max-w-6xl _px-6 _pt-4 md:_px-12">
        {activeType !== 'page' && themeContext.breadcrumb && (
          <Breadcrumb activePath={activePath} />
        )}
        {body}
      </main>
    </article>
  )
}

const DEFAULT_COMPONENTS: MDXComponents = {
  a: Link,
  pre: Pre,
  code: Code,
  wrapper: function NextraWrapper({ toc, children }) {
    const config = useConfig()
    const themeConfig = useThemeConfig()
    const {
      activeType,
      activeThemeContext: themeContext,
      docsDirectories,
      directories
    } = config.normalizePagesResult

    const tocEl =
      activeType === 'page' ||
      !themeContext.toc ||
      themeContext.layout !== 'default' ? (
        themeContext.layout !== 'full' &&
        themeContext.layout !== 'raw' && (
          <nav className={classes.toc} aria-label="table of contents" />
        )
      ) : (
        <nav
          className={cn(classes.toc, '_px-4')}
          aria-label="table of contents"
        >
          {renderComponent(themeConfig.toc.component, {
            toc: themeConfig.toc.float ? toc : [],
            filePath: config.filePath
          })}
        </nav>
      )
    return (
      <div
        className={cn(
          '_mx-auto _flex',
          themeContext.layout !== 'raw' && '_max-w-[90rem]'
        )}
      >
        <Sidebar
          docsDirectories={docsDirectories}
          fullDirectories={directories}
          toc={toc}
          asPopover={config.hideSidebar}
          includePlaceholder={themeContext.layout === 'default'}
        />
        {tocEl}
        <SkipNavContent />
        <Body>{children}</Body>
      </div>
    )
  } satisfies NextraMDXContent
}

export function getComponents({
  components
}: {
  components?: DocsThemeConfig['components']
}): MDXComponents {
  const context = { index: 0 }
  return {
    ...DEFAULT_COMPONENTS,
    h2: createHeading('h2', context),
    h3: createHeading('h3', context),
    h4: createHeading('h4', context),
    h5: createHeading('h5', context),
    h6: createHeading('h6', context),
    ...components
  }
}
