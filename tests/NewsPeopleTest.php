<?php
require_once __DIR__ . '/../includes/news-people.php';

assertSame(['Alice', 'Bob', 'Charlie'], newsPeople(' Alice ,  Bob;Charlie , '), 'newsPeople() splits on commas and semicolons, trims, drops empty names');
assertSame(['Alice'], newsPeople('Alice, Alice'), 'newsPeople() drops repeats');
assertSame([], newsPeople(null), 'newsPeople() of NULL is empty');
assertSame([], newsPeople(' , '), 'newsPeople() of separators only is empty');

assertSame('', formatPeopleList([], 'fr'), 'formatPeopleList() of nobody is empty');
assertSame('Alice', formatPeopleList(['Alice'], 'fr'), 'one name alone');
assertSame('Alice et Bob', formatPeopleList(['Alice', 'Bob'], 'fr'), 'two names, French');
assertSame('Alice, Bob and Charlie', formatPeopleList(['Alice', 'Bob', 'Charlie'], 'en'), 'three names, English');
