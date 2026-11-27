import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../shared/widgets/astro_design_system.dart';
import '../../../shared/widgets/astro_loader/astro_loader_inline.dart';
import '../../../shared/widgets/subtle_celestial_background.dart';
import '../models/home_content_models.dart';
import '../providers/home_content_providers.dart';
import '../widgets/home_net_image.dart';
import 'blog_detail_screen.dart';

/// All published blog posts, newest first, 12 at a time, with category chips.
class BlogListScreen extends ConsumerStatefulWidget {
  const BlogListScreen({super.key});

  @override
  ConsumerState<BlogListScreen> createState() => _BlogListScreenState();
}

class _BlogListScreenState extends ConsumerState<BlogListScreen> {
  static const int _pageSize = 12;
  final List<HomeBlogSummary> _posts = [];
  final Set<String> _categories = {};
  String? _category;
  int _page = 0;
  int _total = 0;
  bool _loading = false;
  Object? _error;

  bool get _isHindi => Localizations.maybeLocaleOf(context)?.languageCode == 'hi';
  bool get _hasMore => _posts.length < _total;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadMore());
  }

  Future<void> _loadMore() async {
    if (_loading) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final page = await ref.read(homeContentRepositoryProvider).fetchBlogs(page: _page + 1, limit: _pageSize, category: _category);
      if (!mounted) return;
      setState(() {
        _page += 1;
        _total = page.total;
        _posts.addAll(page.blogs);
        if (_category == null) _categories.addAll(page.blogs.map((b) => b.category).where((c) => c.isNotEmpty));
        if (page.blogs.isEmpty) _total = _posts.length;
      });
    } catch (e) {
      if (mounted) setState(() => _error = e);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _selectCategory(String? category) {
    if (category == _category) return;
    setState(() {
      _category = category;
      _posts.clear();
      _page = 0;
      _total = 0;
    });
    _loadMore();
  }

  @override
  Widget build(BuildContext context) {
    final title = _isHindi ? 'ब्लॉग' : 'Blog';
    final slivers = <Widget>[AstroSliverNavBar(title: title)];

    if (_categories.length > 1) {
      slivers.add(SliverToBoxAdapter(
        child: SizedBox(
          height: 48,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
            children: [
              Padding(
                padding: const EdgeInsets.only(right: AppSpacing.xs),
                child: AstroPill(label: _isHindi ? 'सभी' : 'All', selected: _category == null, onTap: () => _selectCategory(null)),
              ),
              for (final c in (_categories.toList()..sort()))
                Padding(
                  padding: const EdgeInsets.only(right: AppSpacing.xs),
                  child: AstroPill(label: c, selected: _category == c, onTap: () => _selectCategory(c)),
                ),
            ],
          ),
        ),
      ));
    }

    if (_posts.isEmpty && _error != null) {
      slivers.add(SliverFillRemaining(hasScrollBody: false, child: AstroErrorState(onRetry: _loadMore)));
    } else if (_posts.isEmpty && !_loading && _page > 0) {
      slivers.add(SliverFillRemaining(
        hasScrollBody: false,
        child: AstroEmptyState(title: _isHindi ? 'अभी कोई लेख नहीं' : 'No posts yet', message: _isHindi ? 'नए लेख जल्द आएंगे।' : 'New articles will appear here.'),
      ));
    } else {
      slivers.add(AstroSliverContent(
        top: 8,
        bottom: 24 + MediaQuery.paddingOf(context).bottom,
        sliver: SliverList(
          delegate: SliverChildBuilderDelegate(
            (context, index) {
              if (index >= _posts.length) {
                if (_hasMore && !_loading && _error == null) WidgetsBinding.instance.addPostFrameCallback((_) => _loadMore());
                return const Padding(padding: EdgeInsets.all(AppSpacing.lg), child: Center(child: AstroLoaderInline()));
              }
              return Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                child: BlogRow(post: _posts[index]),
              );
            },
            childCount: _posts.length + ((_hasMore || (_loading && _posts.isEmpty)) ? 1 : 0),
          ),
        ),
      ));
    }

    return Scaffold(
      backgroundColor: AppColors.lightBackground,
      body: SubtleCelestialBackground(child: CustomScrollView(slivers: slivers)),
    );
  }
}

/// One post in the list: thumbnail, title, category and date.
class BlogRow extends StatelessWidget {
  final HomeBlogSummary post;

  const BlogRow({super.key, required this.post});

  @override
  Widget build(BuildContext context) {
    final date = post.publishedAt == null ? null : DateFormat.yMMMd().format(post.publishedAt!.toLocal());
    return AstroCard(
      padding: const EdgeInsets.all(AppSpacing.sm),
      onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => BlogDetailScreen(slug: post.slug))),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: HomeNetImage(post.thumbnailUrl, width: 96, height: 72, placeholderIcon: Icons.article_outlined),
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(post.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: AppTypography.titleSmall.copyWith(color: AppColors.textPrimary)),
                const SizedBox(height: 4),
                Text(
                  [if (post.category.isNotEmpty) post.category, if (date != null) date].join(' · '),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: AppTypography.caption.copyWith(color: AppColors.textMuted),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
