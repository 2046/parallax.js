(function () {
    'use strict'

    var $window, isSupport3d, isSupportTouch;

    $window = $(window);
    isSupport3d = support3d();
    isSupportTouch = supportTouch();

    $.fn.parallax = function (options) {
        options = $.extend({
            anchors: [],
            diffHeight : 0,
            animated: false,
            scrollingSpeed: 1000,
            bottomShowScrollBar: false,
            callback: function (currentIndex, currentPage, container, next) {
            }
        }, options);

        var parallax = {
            attributes: {
                width: 0,
                height: 0,
                crop: null,
                currentPage: 0,
                scrollingSpeed: 0,
                animationing: false
            },
            scrollings: [],
            element: $(this),
            sectionsElement: null,
            rootElement: $('body'),
            prevTime: new Date().getTime(),
            init: function () {
                this.element.wrap($('<div />'));
                this.wrapElement = this.element.parent();
                this.sectionsElement = this.element.find('.section');
                this.touchMoveHandler = $.proxy(this.touchMoveHandler, this);
                this.touchStartHandler = $.proxy(this.touchStartHandler, this);
                this.MouseWheelHandler = $.proxy(this.MouseWheelHandler, this);

                this.set('crop', true);
                this.set('width', $window.width());
                this.set('height', $window.height() - options.diffHeight);
                this.set('anchors', options.anchors);
                this.set('animated', options.animated);
                this.set('callback', options.callback);
                this.set('scrollingSpeed', options.scrollingSpeed);
                this.set('bottomShowScrollBar', options.bottomShowScrollBar);

                this.renderStyle();
                this.bindScrollEvent();
                this.bindWindowResizeEvent();
                this.bindWindowScrollEvent();

                this.element.data('instance', this);
            },
            renderStyle: function () {
                var cssObj = {
                    'width': '100%',
                    'height': '100%'
                };

                $('html').css($.extend({}, cssObj, {
                    'overflow-x': 'hidden'
                }));

                this.rootElement.css(cssObj);

                this.wrapElement.css({
                    overflow: 'hidden',
                    width: this.get('width'),
                    height: this.get('height')
                });

                this.element.css($.extend({}, cssObj, {
                    'position': 'relative'
                }));

                this.sectionsElement.css($.extend({}, cssObj, {
                    'position': 'relative'
                }));
            },
            bindScrollEvent: function () {
                if (isSupportTouch) {
                    addTouchHandler(this.element, this.touchStartHandler, this.touchMoveHandler);
                } else {
                    addMouseWheelHandler(this.element, this.MouseWheelHandler);
                }
            },
            unbindScrollEvent: function () {
                if (isSupportTouch) {
                    removeTouchHandler(this.element, this.touchStartHandler, this.touchMoveHandler);
                } else {
                    removeMouseWheelHandler(this.element, this.MouseWheelHandler);
                }
            },
            bindWindowResizeEvent: function () {
                $window.on('resize', $.proxy(function () {
                    this.set('width', $window.width());
                    this.set('height', $window.height() - options.diffHeight);
                    this.movePage(this.get('currentPage'));
                }, this));
            },
            bindWindowScrollEvent: function () {
                var timerId = 0;

                $window.on('scroll', $.proxy(function () {
                    if ($window.scrollTop() === 0) {
                        clearTimeout(timerId);

                        if (isSupportTouch) {
                            this.hideScrollBar();
                        } else {
                            timerId = setTimeout($.proxy(function () {
                                this.hideScrollBar();
                            }, this), 100);
                        }
                    }
                }, this));
            },
            MouseWheelHandler: function (e) {
                var curTime, delta, horizontalDetection, isScrollingVertically;

                e.preventDefault ? e.preventDefault() : e.returnValue = false;
                e = e || window.event;
                curTime = new Date().getTime();
                delta = e.wheelDelta || -e.deltaY || -e.detail;
                horizontalDetection = typeof e.wheelDeltaX !== 'undefined' || typeof e.deltaX !== 'undefined';
                isScrollingVertically = (Math.abs(e.wheelDeltaX) < Math.abs(e.wheelDelta)) || (Math.abs(e.deltaX) < Math.abs(e.deltaY) || !horizontalDetection);

                if (this.scrollings.length > 149) {
                    this.scrollings.shift();
                }

                this.scrollings.push(Math.abs(delta));

                if (curTime - this.prevTime > 200) {
                    this.scrollings = [];
                }

                this.prevTime = curTime;
                if (!this.get('animationing') && getAverage(this.scrollings, 10) >= getAverage(this.scrollings, 70) && isScrollingVertically) {
                    this[Math.max(-1, Math.min(1, delta)) < 0 ? 'nextPage' : 'prevPage']();
                }
            },
            touchStartHandler: function (event) {
                event.preventDefault();

                this.element.data('touchStartY', getEventsPage(event.originalEvent).y);
            },
            touchMoveHandler: function (event) {
                event.preventDefault();

                clearTimeout(this.__timerId);
                this.__timerId = setTimeout($.proxy(function () {
                    var touchStartY, touchEndY;

                    if (this.get('animationing')) {
                        return;
                    }

                    touchStartY = this.element.data('touchStartY');
                    touchEndY = getEventsPage(event.originalEvent).y;

                    if (Math.abs(touchStartY - touchEndY) > (this.get('height') / 100 * 5)) {
                        if (touchStartY > touchEndY) {
                            this.nextPage();
                        } else if (touchEndY > touchStartY) {
                            this.prevPage();
                        }
                    }
                }, this), 100);
            },
            movePage: function (index) {
                if (this.get('animationing') || (index >= this.sectionsElement.length)) {
                    return;
                }

                this.set('currentPage', index);
            },
            prevPage: function () {
                var currentPage = this.get('currentPage');

                if (currentPage === 0) {
                    this.set('animationing', false);
                    return;
                }

                this.set('animationing', true);
                this.set('currentPage', --currentPage);
            },
            nextPage: function () {
                var currentPage = this.get('currentPage');

                if (currentPage === this.sectionsElement.length - 1) {
                    this.showScrollBar();
                    this.set('animationing', false);
                    return;
                }

                this.set('animationing', true);
                this.set('currentPage', ++currentPage);
            },
            showScrollBar: function () {
                this.set('crop', false);
                this.unbindScrollEvent()
            },
            hideScrollBar: function () {
                this.set('crop', true);
                this.bindScrollEvent();
            },
            get: function (key) {
                return this.attributes[key];
            },
            set: function (key, value) {
                var methodName = 'onChange' + capitalize(key);

                this.attributes[key] = value;

                if (this[methodName]) {
                    this[methodName](key, value);
                }

                return this;
            },
            onChangeWidth: function (key, value) {
                this.wrapElement.css(key, value);
            },
            onChangeHeight: function (key, value) {
                this.wrapElement.css(key, value);
            },
            onChangeCrop: function (key, value) {
                this.rootElement.css('overflow', value ? 'hidden' : 'visible');
            },
            onChangeBottomShowScrollBar: function (key, value) {
                if (!value) {
                    this.showScrollBar = $.noop;
                    this.hideScrollBar = $.noop;
                }
            },
            onChangeAnchors: function (key, value) {
                var hash, index, len;

                if (!(hash = location.hash.slice(1)) || value.length === 0) {
                    return;
                }

                for (index = 0, len = value.length; index < len; index++) {
                    if (value[index] === hash && index !== this.get('currentPage')) {
                        setTimeout($.proxy(function () {
                            this.movePage(index);
                        }, this), 100);
                        break;
                    }
                }
            },
            onChangeCurrentPage: function (key, value) {
                var scrollingSpeed, top, element, next;

                element = this.element;
                top = value * this.get('height');
                scrollingSpeed = this.get('scrollingSpeed');
                next = $.proxy(function () {
                    this.set('animationing', false);
                }, this);

                if (isSupport3d) {
                    if (!element.data('hasTransitionStyle')) {
                        element.data('hasTransitionStyle', true);
                        element.css(getTransition('all ' + scrollingSpeed + 'ms ease'));
                    }

                    element.one('transitionend oTransitionEnd webkitTransitionEnd', $.proxy(function () {
                        this.get('callback')(value, this.sectionsElement.eq(value), element, this.get('animated') ? next : next());
                    }, this)).css(getTransforms('translate3d(0px, -' + top + 'px, 0px)'));
                } else {
                    element.animate({
                        top: -top
                    }, scrollingSpeed, $.proxy(function () {
                        this.get('callback')(value, this.sectionsElement.eq(value), element, this.get('animated') ? next : next());
                    }, this));
                }
            }
        };

        parallax.init();
    };

    function getTransforms(value) {
        return {
            'transform': value,
            '-ms-transform': value,
            '-moz-transform': value,
            '-webkit-transform': value
        };
    }

    function getTransition(value) {
        return {
            'transition': value,
            '-ms-transition': value,
            '-moz-transition': value,
            '-webkit-transition': value
        };
    }

    function support3d() {
        var el, key, has3d, transforms;

        transforms = {
            'transform': 'transform',
            'OTransform': '-o-transform',
            'msTransform': '-ms-transform',
            'MozTransform': '-moz-transform',
            'webkitTransform': '-webkit-transform'
        };

        el = document.createElement('p');
        document.body.insertBefore(el, null);

        for (key in transforms) {
            if (el.style[key] !== undefined) {
                el.style[key] = 'translate3d(1px,1px,1px)';
                has3d = window.getComputedStyle(el).getPropertyValue(transforms[key]);
            }
        }

        document.body.removeChild(el);
        return (has3d !== undefined && has3d.length > 0 && has3d !== 'none');
    }

    function supportTouch() {
        return navigator.userAgent.match(/(iPhone|iPod|iPad|Android|playbook|silk|BlackBerry|BB10|Windows Phone|Tizen|Bada|webOS|IEMobile|Opera Mini)/);
    }

    function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    function getAverage(elements, number) {
        var sum, lastElements, i;

        sum = 0;
        lastElements = elements.slice(Math.max(elements.length - number, 1));

        for (i = 0; i < lastElements.length; i++) {
            sum = sum + lastElements[i];
        }

        return Math.ceil(sum / number);
    }

    function addMouseWheelHandler(element, handler) {
        var mouseWheelEventName = element.data('mouseWheelEventName');

        if (!mouseWheelEventName) {
            element.data('mouseWheelEventName', mouseWheelEventName = detectMouseWheelEventName());
        }

        if (window.addEventListener) {
            document.addEventListener(mouseWheelEventName, handler, false);
        } else {
            document.attachEvent(mouseWheelEventName, handler, false);
        }
    }

    function removeMouseWheelHandler(element, handler) {
        var mouseWheelEventName = element.data('mouseWheelEventName');

        if (document.addEventListener) {
            document.removeEventListener(mouseWheelEventName, handler, false);
        } else {
            document.detachEvent(mouseWheelEventName, handler);
        }
    }

    function detectMouseWheelEventName() {
        return 'onwheel' in document.createElement('div') ? 'wheel' : (document.onmousewheel !== undefined ? (!window.addEventListener ? 'onmousewheel' : 'mousewheel') : 'MozMousePixelScroll');
    }

    function addTouchHandler(element, startHandler, moveHandler) {
        $(document).on('touchstart', startHandler);
        $(document).on('touchmove', moveHandler);
    }

    function removeTouchHandler(element, startHandler, moveHandler) {
        $(document).off('touchstart', startHandler);
        $(document).off('touchmove', moveHandler);
    }

    function getEventsPage(e) {
        var events = {};

        events.y = (typeof e.pageY !== 'undefined' && (e.pageY || e.pageX) ? e.pageY : e.touches[0].pageY);
        events.x = (typeof e.pageX !== 'undefined' && (e.pageY || e.pageX) ? e.pageX : e.touches[0].pageX);

        return events;
    }
})();
