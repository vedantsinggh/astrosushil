'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { BlogForm } from '../../../components/content/BlogForm';
import { PageHeader, PermissionGate } from '../../../components/content/ui';

function NewBlogScreen() {
  const router = useRouter();
  return (
    <div>
      <PageHeader
        crumbs={[{ label: 'Blogs', href: '/blogs' }, { label: 'New post' }]}
        title="Add Blog Post"
        subtitle="A draft stays hidden from the website until it is published"
      />
      <BlogForm blog={null} onSaved={(blog) => router.push(`/blogs/${blog.id}?saved=created`)} />
    </div>
  );
}

export default function NewBlogPage() {
  return (
    <PermissionGate permission="blogs:create" area="creating blog posts">
      <NewBlogScreen />
    </PermissionGate>
  );
}
