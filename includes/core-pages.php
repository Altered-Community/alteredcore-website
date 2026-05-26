<?php
// Core pages — listed here = protected from edit/delete in the admin panel.
// public: true  = accessible without a nav_items entry
// public: false = always blocked (template/dev pages)
$__corePages = [
    '404'           => ['public' => true],
    'account'       => ['public' => true],
    'feedback'      => ['public' => true],
    'home'          => ['public' => true],
    'iframe'        => ['public' => true],
    'index'         => ['public' => true],
    'login'         => ['public' => true],
    'maintenance'   => ['public' => true],
    'news'          => ['public' => true],
    'news-detail'   => ['public' => true],
    'privacy'       => ['public' => true],
    'projects'      => ['public' => true],
    'register'      => ['public' => true],
    'rss'           => ['public' => true],
    'template'      => ['public' => false],
    'template_code' => ['public' => false],
];
