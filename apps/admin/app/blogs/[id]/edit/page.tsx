'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Blog, apiErrorMessage, blogsApi } from '../../../../lib/api/content';
import { BlogForm } from '../../../../components/content/BlogForm';
import { LoadError, PageHeader, PermissionGate } from '../../../../components/content/ui';

function EditBlogScreen() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [blog, setBlog] = useState<Blog | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setBlog(await blogsApi.get(id));
    } catch (err) {
      setLoadError(apiErrorMessage(err, 'Failed to load the blog post.'));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <PageHeader
        crumbs={[
          { label: 'Blogs', href: '/blogs' },
          { label: blog ? blog.title : 'Post', href: `/blogs/${id}` },
          { label: 'Edit' },
        ]}
        title="Edit Blog Post"
        subtitle={blog ? blog.title : undefined}
      />

      {loadError && <LoadError message={loadError} onRetry={load} />}

      {isLoading ? (
        <div className="card">
          <div className="skeleton" style={{ height: '28px', width: '50%', marginBottom: '1rem' }} />
          <div className="skeleton" style={{ height: '320px', width: '100%' }} />
        </div>
      ) : blog ? (
        <BlogForm key={blog.id} blog={blog} onSaved={(saved) => router.push(`/blogs/${saved.id}?saved=updated`)} />
      ) : (
        !loadError && (
          <div className="card" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Blog post not found.
          </div>
        )
      )}
    </div>
  );
}

export default function EditBlogPage() {
  return (
    <PermissionGate permission="blogs:update" area="editing blog posts">
      <EditBlogScreen />
    </PermissionGate>
  );
}
