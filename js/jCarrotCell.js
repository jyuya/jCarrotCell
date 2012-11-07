/** jCarrotCell
		Julia Yu
		11/17/2011
*/
(function($){
	
	var methods = {
		carrots : {},
		defaults : {},
		count : 0,
		
		makeCarrot : function(){
			var $this = null, // this carrot cell
				// populate default settings
				settings = {
					step: 0,
					key: false,
					sideways: true,
					infinite: false,
					auto: false,
					speed: 1000,
					navi: false,
					makeNavi: false,
					delay: 5000,
					containsControl : true,
					controlScope : "",
					stopOnClick : false,
					pauseOnHover : false,
					off: "disabled",
					unseen: "invisible",
					current: "current",
					sliderSelect : "ol",
					sliderChildSelect : "li",
					prevSelect : ".prev",
					nextSelect : ".next",
					pauseSelect :  ".pause",
					playSelect : ".play",
					stopSelect : ".stop",
					naviContainer : ".navi",
					naviSelect : "> *",
					naviClass : "naviItem"
				},
				
				// properties of this carrotCell
				slideWidth = 0,
				haveBack = false,
				haveForward = true,
				currentPage = 1,
				currentItem = 1,
				playing = false,
				paused = false,
				stopped = false,
				scrolling = false,
				visibleDifference = 0,
				leftover = 0,
				inpage = 0,
				extras = 0,
				api, view, slider, items, single, totalItems,
				frameSize, singleSize, viewSize,
				autoScroll, pause, play, stop, 
				visible, advanceBy, pages, slideBy, prev, next, navi,
				sliderSelect, sliderChildSelect, prevSelect, nextSelect,
				pauseSelect, playSelect, stopSelect, naviContainer, naviSelect;
				
			/** scroll the carousel
			*/
			var gotoPage = function(page) {
				var dir = page < currentPage ? -1 : 1,
		            n = Math.abs(currentPage - page),
					scrollTo = singleSize * dir * advanceBy * n;
				
				// set the current page we are to be on after this
				var thisPage = currentPage;
				if (dir < 0) { thisPage--; } else { thisPage++; }
				currentItem = advanceBy * thisPage + dir;

				// this function is called after the animation stops
				var scrollHandler = function(){
					var scrollThis = 0;
					if (page == 0) {
						scrollThis = singleSize * advanceBy * pages + extras * singleSize;
						// weird hack
						if (visible == advanceBy ) { scrollThis = singleSize * advanceBy * pages - extras * singleSize; }			
						if (settings.sideways) { view.scrollLeft(scrollThis); } else { view.scrollTop(scrollThis); }
						page = pages;
					} else if (page > pages) {
						scrollThis = singleSize * visible;
						if (settings.sideways) { view.scrollLeft(scrollThis); } else { view.scrollTop(scrollThis); }
						page = 1; // reset back to start position
					}         				                
					currentPage = page;
					scrolling = false;
					settings.controlScope.trigger("movingDone", [settings.name, page]);
				};
				
				// broadcast event that carousel is moving
				settings.controlScope.trigger("moving", [settings.name, page]);
				scrolling = true;
				if (settings.sideways) {
					view.filter(':not(:animated)').animate({ scrollLeft : '+=' + scrollTo }, settings.speed, scrollHandler);
				} else {
					view.filter(':not(:animated)').animate({ scrollTop : '+=' + scrollTo }, settings.speed, scrollHandler);
				}
			};
			
			/** this only goes forward by 1, note a page forward
				only for insert
			*/
			var moveOnInsert = function() {
				var scrollTo = singleSize * advanceBy;
				var moveScrollHandler = function(){
					var scrollThis = singleSize * advanceBy * pages + extras * singleSize;
					if (settings.sideways) { view.scrollLeft(scrollThis); } else { view.scrollTop(scrollThis); }
					scrolling = false;
				};

				scrolling = true;
				if (settings.sideways) {
					view.filter(':not(:animated)').animate({ scrollLeft : '+=' + scrollTo }, settings.speed, moveScrollHandler);
				} else {
					view.filter(':not(:animated)').animate({ scrollTop : '+=' + scrollTo }, settings.speed, moveScrollHandler);
				}
			}
			
			/** show previous and next depending on boolean set in determinePrevNext
			*/
			var showPrevNext = function() {
				if (haveBack) { prev.removeClass(settings.off); } else { prev.addClass(settings.off); }
				if (haveForward) { next.removeClass(settings.off); } else { next.addClass(settings.off); }
			};
			
			/** determine the prev and next
			*/
			var determinePrevNext = function(nextPage) {
				if (settings.infinite) { return false; } // do nothing if its infinite
				
				if (nextPage <= 1) { haveBack = false; } else { haveBack = true; };
				if (nextPage >= pages) { haveForward = false; } else { haveForward = true; };
				if (!nextPage) { 
					if (currentPage == 1) {
						haveBack = false; 
					}
				}
				
				var currentSlide = nextPage * settings.step; // the last slide out of view
				var endSlide = currentSlide + visibleDifference; // the last slide in view
				if (endSlide >= totalItems) { haveForward = false; }
				
				showPrevNext();
			};

			/** move carousel back
			*/
			var moveBack = function() {
				if (!settings.infinite && (currentPage == 1)) { return false; } // we are at the left most page or its circular
				var nextPage = currentPage - 1;
				gotoPage(nextPage);
				determinePrevNext(nextPage);
			};

			/** move carousel forward
			*/
			var moveForward = function() {
				if (!settings.infinite && (currentPage >= pages)) { return false; } // we are at the right most page
				
				var nextPage = currentPage + 1;
				gotoPage(nextPage);
				determinePrevNext(nextPage);
			};
			
			/** set up the interval
			*/
			var goScroll = function(){
				window.clearInterval(autoScroll);
				autoScroll = this.setInterval(function(){ if (!paused) { moveForward(); } }, settings.delay);
			};
			
			/** pause the auto play
			*/
			var pauseCell = function() {
				if (paused) { return false; }
				paused = true;
				playing = false;
				stopped = false;
				pause.addClass(settings.unseen);
				play.removeClass(settings.unseen);
				stop.removeClass(settings.unseen);
			};
			
			/** resume the auto play
			*/
			var playCell = function() {
				if (playing) { return false; }
				paused = false;
				stopped = false;
				playing = true;
				play.addClass(settings.unseen);
				stop.removeClass(settings.unseen);
				pause.removeClass(settings.unseen);
				goScroll();
			};
			
			/** resume the auto play
			*/
			var stopCell = function() {
				if (stopped) { return false; }
				paused = false;
				stopped = true;
				playing = false;
				stop.addClass(settings.unseen);
				play.removeClass(settings.unseen);
				pause.removeClass(settings.unseen);
				window.clearInterval(autoScroll);
			};
			
			/** set up the controls if any, then auto scroll
			*/
			var setupAutoAdvance = function(){
				pause.bind("click", function(e){
					e.preventDefault();
					pauseCell();
				});
				play.bind("click", function(e){
					e.preventDefault();
					playCell();
				});
				stop.bind("click", function(e){
					e.preventDefault();
					stopCell();
				});
				playCell();
			};

			/** up down for vertical, left right for horizonal
			*/
			var setupKeyAdvance = function() {
				$(document).keydown(function(e){
					if (scrolling) { return false; }
					if (settings.sideways) { 
				    	if (e.keyCode == 37) { moveBack(); } // left
						if (e.keyCode == 39) { moveForward(); } // right
					} else {
						if (e.keyCode == 38) {  moveBack(); } // up
						if (e.keyCode == 40) {  moveForward(); } // down
					}
				});
			};
			
			/** if set on auto create 
			*/
			var creatNavi = function(){
				$(naviContainer).empty(); // clear the navi container
				
				// create the navi item names list, default is numbers
				var itemNames = {};
				for (var j = 1; j <= pages; j++) {
					itemNames[j] = j;
				}
				
				var nameList = $(naviContainer).data("navi");
				if ((nameList !== undefined) && (nameList.length !== 0) ) {					
					$(nameList).each(function(n){
						itemNames[n+1] = nameList[n]; // add the names into itemnames
					});								
				} 
				
				var pre = '<div class="' + settings.naviClass +'">'; // default is div
				var post = '</div>';
				if ($(naviContainer).is("ul") || $(naviContainer).is("ol")) {
					pre = '<li class="' + settings.naviClass +'">';
					post = '</li>';				
				} 
				for (var i = 1; i <= pages; i++) {
					$(naviContainer).append(pre + itemNames[i] + post);
				}			
				navi = $(naviContainer).find("> *"); // find all the things we just added
			};
			
			/** subscribe to moving and make sure it is our thing that's moving
			*/
			var updateMovingNavi = function() {
				settings.controlScope.bind("moving", function(e, movingThing, pageNum) {
					if (movingThing == settings.name) {
						$(navi).removeClass(settings.current);
						if (pageNum > pages) {
							pageNum = 1;
						}
						var thisNavi = $(navi)[parseInt(pageNum)-1];
						$(thisNavi).addClass(settings.current);
					}
				});
			};
			
			/** set up navigation, only works on pages
			*/
			var setupNavi = function() {
				if (pages <= 1) {
					$(navi).hide();	
					return false;
				}
				
				if (settings.makeNavi) {
					creatNavi();
				}
				
				$(navi).first().addClass(settings.current);
				navi.each(function(iNav){
					var thisNavi = this;
					var navIndex = iNav + 1;
					$(thisNavi).bind("click", function(){
						if (playing && settings.stopOnClick) {  stopCell(); }
						$(this).siblings().removeClass(settings.current);
						$(this).addClass(settings.current);
						
						if (scrolling) { return false; } // no queue ups on rapid clicking
						if (navIndex <= pages) {
							gotoPage(navIndex);
							determinePrevNext(navIndex);
						}
					});
				});		
				
				updateMovingNavi();
					
			};
			
			/** assign handlers
			*/
			var assignCarrot = function(){
				
				// show the buttons as well as bind click handler
				prev.bind("click", function(e){
					e.preventDefault();
					moveBack();
				}).show();

				next.bind("click", function(e){
					e.preventDefault();
					moveForward();
				}).show();
				
				// if touch wipe exists... decide orientation
				if(jQuery().touchwipe) {					
					if (settings.sideways) {
						$($this).touchwipe({
						    wipeLeft: function() {  moveForward(); },
						    wipeRight: function() {  moveBack(); }
						});
					} else {
						$($this).touchwipe({
						    wipeDown: function() {  moveForward(); },
						    wipeUp: function() {  moveBack(); }
						});
					}			
				}
				
				// add pause on hover
				if (settings.pauseOnHover && settings.auto) {	
					view.bind({
						mouseenter : function() { pauseCell(); },
						mouseleave: function(){ playCell(); }
					});
				}
				 
				if (settings.navi) { setupNavi(); }
				if (settings.key) { setupKeyAdvance(); }
				if (settings.auto) { setupAutoAdvance(); } 
			};
			
			/** fix the width of the slide container when things are added 
			*/
			var adjustSlideSize = function(){
				var slideSize = singleSize * items.length; // find size of all items including cloned
				if (settings.sideways) { 
					slider.css("width",  slideSize + "px"); // set length of slider
				} else {
					slider.css("height",  slideSize + "px"); // set height of slider
				}
			};
			
			/** find how many pages there are
			*/
			var calculatePages = function(){						
				if ((visible !== advanceBy) && (!settings.auto)) {
					pages = Math.ceil((totalItems - (visible - advanceBy)) / advanceBy);				
				} else {
					pages = Math.ceil(totalItems / advanceBy);																
				}				
				if ((totalItems % visible) != 0) {
					extras = visible * Math.ceil(totalItems / visible) - totalItems;
				} else {
					extras = 0;
				}												
			};
			
			/** check if content is too short to scroll
			*/
			var notEnoughToScroll = function(){
				if (totalItems <= visible) {
					prev.addClass(settings.off);
					next.addClass(settings.off);
				}	
			};

			/** find size of view
			*/
			var findViewsize = function(){
				if (settings.sideways) {
					viewSize = $this.innerWidth();
					singleSize = single.outerWidth(true);
				} else {
					viewSize = $this.innerHeight();
					singleSize = single.outerHeight(true);
				}
				
				visible = Math.floor(viewSize / singleSize); // visible is everything in frame unless a step is set
			}
			
			/** calculate the settings of the carrot
			*/
			var processCarrot = function(){
				if (settings.auto) { settings.infinite = true;  } // if auto infinite hast o be true
				findViewsize();
				if (settings.step) { advanceBy = settings.step; } else { advanceBy = visible; }
				calculatePages();
				slideBy = singleSize * advanceBy;
				if (settings.infinite) {
					// clone a visible amount on the begin and end
					items.filter(':first').before(items.slice(-visible).clone().addClass('cloned'));
					items.filter(':last').after(items.slice(0, visible).clone().addClass('cloned'));
					items = slider.children(settings.sliderChildSelect); // reselect new li
				} else {
					prev.addClass(settings.off);
				}
				adjustSlideSize();
				view.css("overflow", "hidden"); // clip extra items	
				
				if (settings.infinite) {
					if (settings.sideways) {
						view.scrollLeft(singleSize * visible); // move clone items out of sight
					} else {
						view.scrollTop(singleSize * visible); // move clone items out of sight
					}
				}
			};
			
			/** find child elements of slider
			*/
			var findItems = function(){
				items = slider.children(settings.sliderChildSelect); 
				totalItems = items.length;
				single = items.filter(':first');
				notEnoughToScroll();
			};

			/** find elements
			*/
			var findCarrot = function(){
				view = $this.children(".carrotCellView:first");	// find first carrotcellview	
				slider = view.children(settings.sliderSelect); 
				findItems();
				
				if (settings.containsControl) {
					settings.controlScope = $this; // everything is self contained
				} else {
					if (settings.controlScope != "") {
						settings.controlScope = $(settings.controlScope); // use selector
					} else {
						settings.controlScope = $("body"); // default to document
					}	
				}
				
				prev = settings.controlScope.find(settings.prevSelect); 
				next = settings.controlScope.find(settings.nextSelect); 
				pause = settings.controlScope.find(settings.pauseSelect);
				play = settings.controlScope.find(settings.playSelect);
				stop = settings.controlScope.find(settings.stopSelect);
				naviContainer = settings.controlScope.find(settings.naviContainer);
				navi = naviContainer.find(settings.naviSelect);
				
				processCarrot();
				assignCarrot();
				notEnoughToScroll();
				
				if (visible > settings.step) {
					visibleDifference = visible - settings.step;
				}
				leftover = totalItems % settings.step; // left over in a page 
				inpage = settings.step;  // how many in a page
			};

			return {
				/** initialize this carrot instance
				*/
				init : function(opt) {
					$.extend(settings, opt); // options over ride settings
					$this = $(opt.scope);
					findCarrot();
					// call done callback pass it the api
					if ((typeof settings.carrotDone) == "function") { settings.carrotDone(this); }
				},
				
				/** find out this carrot instance's name
				*/
				whichCarrot : function(){ return settings.name; },
				
				/** find out how many pages this carrot has
				*/
				getPageCount : function(){ return pages; },
				
				/** move to the page passed in if its a number in range
				*/
				moveToPage : function(movePage) {
					movePage = parseInt(movePage);
					if (isNaN(movePage)) {  return false; }					
					if ((movePage < 1) || (movePage > pages)) { return false; }
					gotoPage(movePage); // move
				},
				
				/** move forward by one
				*/
				advance : function() { moveForward(); },
				
				/** move backward by one
				*/
				rewind : function() { moveBack(); },

				/** stop auto
				*/
				stop : function() { stopCell() },
				
				/** resume auto play
				*/
				play : function() { playCell() },
				
				/** pause auto play
				*/
				pause : function() { pauseCell() },
				
				/** remove all carrot items
				*/
				empty : function() { $(items).remove(); },
				
				/** remove an item from the carousel (by index)
					index starts at 1, if no index, remove last
				*/
				remove : function(index) {
					index = parseInt(index);
					if (isNaN(index)) { index = items.length; } // nothing passed, default to last
					if ((index > items.length ) ||  (index < 1 )) {  return false; } // out of range position to remove do nothing
					
					$(items[index-1]).remove();
					findItems();
					calculatePages();
					adjustSlideSize();
				},
				
				/** add a new item to the carousel (at index or at end)
				*/
				insert : function(newItem, index) {
					if (!newItem) { return false; }
					index = parseInt(index);
					if (isNaN(index)) { index = items.length; } // if no index add at end -- how to account for clones???
					if (index < 1 ) { index = 1; } // range check
					if (index > items.length ) { index = items.length; } // rang check
					
					if (index == items.length) {
						slider.append(newItem); // append at end
					} else if (index <= 1){
						$(settings.sliderChildSelect + ':first', slider).before(newItem); // append at start
					} else {
						$(settings.sliderChildSelect, slider).eq(index-1).before(newItem); // insert at index
					}
					
					findItems();
					processCarrot();
					determinePrevNext();

				},

				/** load an entire new set of slides
				*/
				reloadWith : function(newItems) {
					if (!items) { return false; }		
					$(items).remove(); 
					slider.append(newItems); // append at end
					findItems();
					calculatePages();
					adjustSlideSize();
					gotoPage(1); // rewind to beginning on load
					currentPage = 1;
					determinePrevNext();
				},
				
				/** set api for internal access for whatever reason
				*/
				setAPI : function(newAPI) { api = newAPI; }
			}
		},
		
		/** initialize jcarousel object
		*/
	    init : function( options ) { 	
			if ( options ) { $.extend(options, methods.defaults); }
			return this.each(function(){
				methods.count++;
				var opt = options || {};
				opt.scope = this;
				opt.name = $(opt.scope).attr("id") || ("defaultCarrot"+methods.count);
				
				methods.carrots[opt.name] = new methods.makeCarrot();
				methods.carrots[opt.name].init(opt);
				methods.carrots[opt.name].setAPI(methods.carrots[opt.name]);

				// set up the api data to access the object
				var data = $(this).data('carrotCell');
				if (!data) { $(this).data('carrotCell', methods.carrots[opt.name]); }				
			});
		}
	};
	
	/** invoke methods of this plugin  
		send it to the init if appropriate
	*/
	$.fn.carrotCell = function (method) {
		// Method calling logic
	    if ( methods[method] ) {
	      return methods[ method ].apply( this, Array.prototype.slice.call( arguments, 1 ));
	    } else if ( typeof method === 'object' || ! method ) {
	      return methods.init.apply( this, arguments );
	    } else {
	      $.error( 'Method ' +  method + ' does not exist on jCarrotCell' );
	    }
	};
})(jQuery);