/**
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

import $ from 'jquery';
import firebase from 'firebase/app';
import 'firebase/auth';
import {MaterialUtils} from './Utils';
import page from 'page';

/**
 * Handles the pages/routing.
 */
export default class Router {
  /**
   * Initializes the Friendly Pix controller/router.
   * @constructor
   */
  constructor(loadApp, auth) {
    this.auth = auth;

    // Dom elements.
    this.pagesElements = $('[id^=page-]');
    this.splashLogin = $('#login', '#page-splash');

    // Make sure /add is never opened on website load.
    if (window.location.pathname === '/add') {
      page('/');
    }

    // Configuring routes.
    const pipe = Router.pipe;
    const displayPage = this.displayPage.bind(this);
    const displaySplashIfSignedOut = () => this.displaySplashIfSignedOut();
    const loadUser = (userId) => loadApp().then(({userPage}) => userPage.loadUser(userId));
    const searchHashtag = (hashtag) => loadApp().then(({searchPage}) => searchPage.loadHashtag(hashtag));
    const showHomeFeed = () => loadApp().then(({feed}) => feed.showHomeFeed());
    const showGeneralFeed = () => loadApp().then(({feed}) => feed.showGeneralFeed());
    const clearFeed = () => loadApp().then(({feed}) => feed.clear());
    const showPost = (postId) => loadApp().then(({post}) => post.loadPost(postId));

    page('/', pipe(displaySplashIfSignedOut, {continue: true}), pipe(displayPage, {pageId: 'splash'}));
    page('/home', pipe(showHomeFeed, {continue: true}), pipe(displayPage, {pageId: 'feed', onlyAuthed: true}));
    page('/recent', pipe(showGeneralFeed, {continue: true}), pipe(displayPage, {pageId: 'feed'}));
    page('/post/:postId', pipe(showPost, {continue: true}), pipe(displayPage, {pageId: 'post'}));
    page('/user/:userId', pipe(loadUser, {continue: true}), pipe(displayPage, {pageId: 'user-info'}));
    page('/search/:hashtag', pipe(searchHashtag, {continue: true}), pipe(displayPage, {pageId: 'search'}));
    page('/about', pipe(clearFeed, {continue: true}), pipe(displayPage, {pageId: 'about'}));
    page('/terms', pipe(clearFeed, {continue: true}), pipe(displayPage, {pageId: 'terms'}));
    page('/add', pipe(displayPage, {pageId: 'add', onlyAuthed: true}));
    page('*', () => page('/'));

    // Start routing.
    page();
  }

  /**
   * Returns a function that displays the given page and hides the other ones.
   * if `onlyAuthed` is set to true then the splash page will be displayed instead of the page if
   * the user is not signed-in.
   */
  displayPage(attributes, context) {
    const onlyAuthed = attributes.onlyAuthed;

    if (onlyAuthed) {
      // If the page can only be displayed if the user is authenticated then we wait or the auth state.
      this.auth.waitForAuth.then(() => {
        this._displayPage(attributes, context);
      });
    } else {
      this._displayPage(attributes, context);
    }
  }

  _displayPage(attributes, context) {
    const onlyAuthed = attributes.onlyAuthed;
    let pageId = attributes.pageId;

    // If the page is restricted to signed-in users and the user is not signedin, redirect to the Splasbh page.
    if (onlyAuthed && !firebase.auth().currentUser) {
      return page('/');
    }

    // Displaying the current link as active.
    Router.setLinkAsActive(context.canonicalPath);

    // Display the right page and hide the other ones.
    this.pagesElements.each(function(index, element) {
      if (element.id === 'page-' + pageId) {
        $(element).show();
      } else if (element.id === 'page-splash' && onlyAuthed) {
        $(element).fadeOut(1000);
      } else {
        $(element).hide();
      }
    });

    // Force close the Drawer if opened.
    MaterialUtils.closeDrawer();

    // Scroll to top.
    Router.scrollToTop();
  }

  /**
   * Display the Splash-page if the user is signed-out.
   * Otherwise redirect to the home feed.
   */
  displaySplashIfSignedOut() {
    if (!firebase.auth().currentUser) {
      this.splashLogin.show();
    } else {
      page('/home');
    }
  }

  /**
   * Reloads the current page.
   */
  static reloadPage() {
    let path = window.location.pathname;
    if (path === '') {
      path = '/';
    }
    page(path);
  }

  /**
   * Scrolls the page to top.
   */
  static scrollToTop() {
    $('html,body').animate({scrollTop: 0}, 0);
  }

  /**
   * Pipes the given function and passes the given attribute and Page.js context.
   * A special attribute 'continue' can be set to true if there are further functions to call.
   */
  static pipe(funct, attribute) {
    const optContinue =  attribute ? attribute.continue : false;
    return (context, next) => {
      if (funct) {
        const params = Object.keys(context.params);
        if (!attribute && params.length > 0) {
          funct(context.params[params[0]], context);
        } else {
          funct(attribute, context);
        }
      }
      if (optContinue) {
        next();
      }
    };
  }

  /**
   * Highlights the correct menu item/link.
   */
  static setLinkAsActive(canonicalPath) {
    if (canonicalPath === '') {
      canonicalPath = '/';
    }
    $('.is-active').removeClass('is-active');
    $(`[href="${canonicalPath}"]`).addClass('is-active');
  }
};
