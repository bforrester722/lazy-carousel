/**
 * `lazy-carousel`
 * Self lazy-loading images carousel
 *
 * @customElement
 * @polymer
 * @demo demo/index.html
 */
import {
  SpritefulElement, 
  html
}                 from '@spriteful/spriteful-element/spriteful-element.js';
import {
  listen,
  schedule,
  screenBreakPoints,
  unlisten
}                 from '@spriteful/utils/utils.js';
import htmlString from './lazy-carousel.html';
import '@spriteful/app-carousel/app-carousel.js';


class SpritefulLazyCarousel extends SpritefulElement {
  static get is() { return 'lazy-carousel'; }

  static get template() {
    return html([htmlString]);
  }

  static get properties() {
    return {

      alt: {
        type: String,
        value: 'Carousel image'
      },

      autoPlay: Boolean,
      // controls _numOfImages which is how many
      // images visible on screen at same time
      breakpoints: Object,
      // touch flick decay positive int greater than 0
      decay: {
        type: Number,
        value: 2 // adjust to taste
      },
      // navigation dots
      dots: Boolean,
      // ms to wait between each flip
      flipTime: {
        type: Number,
        value: 3000
      },

      images: Array,    

      moveTo: Number,

      nav: Boolean,
      // overscroll effect decay rate
      overScroll: {
        type: Number,
        value: 5  // adjust to taste
      },

      sizing: {
        type: String,
        value: 'cover'
      },

      type: String,
      
      _dontRunOnReOpen: Boolean,      
    
      _lazyImages: {
        type: Array,
        value: () => ([])
      },
     
      _numOfImages: {
        type: Number,
        value: 1
      },
      // for dom-if's
      _typeIsIronImage: {
        type: Boolean,
        computed: '__computeTypeIsIronImage(type)'
      }

    };
  }


  static get observers() {
    return [
      '__breakPointsChanged(breakpoints, images)',
      '__numOfImagesChanged(_numOfImages, images)'
    ];
  }

  // For dom-if's
  __computeTypeIsIronImage(type) {
    return type === 'iron-image';
  }
  

  __computeSrc(image) {
    if (typeof image === 'string') {
      return image;
    }
    const {optimized, url, src} = image;
    return optimized || url || src;
  }

  
  async __carouselClicked(event) {
    try {
      await this.clicked();
      this.fire('carousel-image-clicked', event);
    }
    catch (error) { 
      if (error === 'click debounced') { return; }
      console.error(error); 
    } 
  }

  // Sets breakpoints at pix sets in calling element
  __breakPointsChanged(breakpoints, images) {
    if (!breakpoints || !images || this._dontRunOnReOpen) { return; }
    const keys   = Object.keys(breakpoints);
    const points = keys.reduce((accum, curr) => {
      accum[curr] = breakpoints[curr].pix;
      return accum; 
    }, {});
    const getSizes = key => {
      const {num} = breakpoints[key];
      this.__calcCarouselResize(num);
    };
    screenBreakPoints(points, getSizes);
    this.$.carousel.init();
  }

  // Lazy loads next image
  __lazyLoadImage(event) {
    const {nextIndex} = event.detail;
    if (
      nextIndex < this._lazyImages.length || 
      nextIndex >= this.images.length
    ) { return; }
    this.push('_lazyImages', this.images[nextIndex]);
  }

  // Pushes first carousel item and sets off carousel-lazy-load events
  __addNextImage(num) {
    this.push('_lazyImages', this.images[num]);
    listen(
      this, 
      'carousel-lazy-load', 
      this.__lazyLoadImage.bind(this)
    );
  }


  async __listenForInitialImagesToLoad(num) {
    const initialImagesLoaded = async (event, key) => {
      const {detail} = event;
      // ignore iron-image not yet loaded
      // responsive-image does not have a value payload with event
      if ('value' in detail && !detail.value) { return; }
      unlisten(key);
      this.__addNextImage(num);
    };

    if (this.type === 'responsive-image') {
      await import('@spriteful/responsive-image/responsive-image.js');
      const [firstImgEl] = this.selectAll('.imgs');
      listen(firstImgEl, 'loaded', initialImagesLoaded);
    }
    else {
      await import('@polymer/iron-image/iron-image.js');
      const [firstImgEl] = this.selectAll('.imgs');
      listen(firstImgEl, 'loaded-changed', initialImagesLoaded);
    }
  }

  // Sets number of carousel items for loading in the right amount of items
  __calcCarouselResize(num) {
    this._numOfImages = num;
    this.$.carousel.init();
  }


  async __numOfImagesChanged(num, images) {
    try {
      await this.debounce('num-of-images-debounce', 50);
      if (!num || !images) { return; } 
      this.__setupCarousel(num, images);
    }
    catch (error) {
      if (error === 'debounced') { return; }
      console.error(error);
    }
  }

  // sets up carousel num of images wait for lighthouse
  async __setupCarousel(numOfImages, images) {
    await schedule();
    if (this.moveTo) {
      const initialImagesCount = this.moveTo + 1;
      this._lazyImages         = images.slice(0, initialImagesCount);
      this._dontRunOnReOpen    = true;
      this.$.carousel.moveToSection(this.moveTo);
      if (images.length !== initialImagesCount) {
        this.__listenForInitialImagesToLoad(initialImagesCount);
      }
      return;
    }
    this._lazyImages = images.slice(0, numOfImages);
    if (images.length === 1) { 
      this.nav = false;
      return; 
    }
    this.__listenForInitialImagesToLoad(numOfImages);
  }

  // loads all images when user interacts with carousel
  __loadAllImages() {
    if (this._lazyImages === this.images) { return; }
    this._lazyImages = this.images;
  }

  // Called from outside to move to section on re-opening same 
  moveToSection(index) {
    this.$.carousel.moveToSection(index);
  }

  // force measure/layout
  init() {
    this.$.carousel.init();
  }

}

window.customElements.define(SpritefulLazyCarousel.is, SpritefulLazyCarousel);
