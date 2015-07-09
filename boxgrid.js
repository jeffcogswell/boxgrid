/* Block class */
(function($) {
  var BoxDrawPositions = {
    allSmall:   function(i) { return [ i%3, Math.floor(i/3) ]; },
    bigLeft:    function(i) { return [   0, i*2             ]; },
    bigRight:   function(i) { return [   1, i*2             ]; },
    smallLeft:  function(i) { return [   0, i               ]; },
    smallRight: function(i) { return [   2, i               ]; }
  };

  function BoxGrid(element, options) {
    this.element = element;
    this.layoutChanged = false;
    this.options = options;

    if (element.find(options.blocks).length == 0) {
      this.init();
    }
    
    this.update();
  }

  BoxGrid.prototype.option = function(opt) {
    if (opt.draggable != undefined && this.options.draggable != opt.draggable) {
      this.makeDraggable(opt.draggable);
    }

    if ((opt.autoHeight && opt.autoHeight != this.options.autoHeight) ||
      (opt.autoHeight == undefined && this.options.autoHeight)) {
      if (opt.gridHeight != undefined) {
        this.options.gridHeight = opt.gridHeight;
      }
      this.setHeight();
    }

    this.options = $.extend(this.options, opt);
  };

  BoxGrid.prototype.init = function() {
    var self = this;
    var element = this.element;
    var options = this.options;

    // Move the items out of the blocks
    // Normally, this wouldn't happen
    element.find(options.blockClass).replaceWith(function() {
      return $(this).children();
    });

    var items = element.find(options.items);
    var layouts = $.fn.boxgrid.layouts;
    for (var i=0; i < items.length/3; i++) {
      var blockItems = items.slice(i*3, (i+1)*3);
      var block = this.newBlock();
      blockItems.wrapAll(block);
    }
    this.itemsInit(items);
    this.makeDraggable(options.draggable);
  };

  BoxGrid.prototype.makeDraggable = function(sw) {
    self = this;
    options = this.options;
    items = this.element.find(options.items);
    var is_touch_device = !!('ontouchstart' in window) || !!('onmsgesturechange' in window);

    if (sw) {
      items.attr('draggable', true);
      if (!is_touch_device) {
        this.element.on('selectstart.boxGrid', options.items, function(event) {
          this.dragDrop();
          return false;
        });

        this.element.on('dragstart.boxGrid', options.items, function(event) {
          var items = self.element.find(self.options.items);
          if (items.index(event.target) >=0) {
            self.dragItem = event.target;
            if (options.onDragStart) {
              options.onDragStart(event, self);
            }
          }
        });

        this.element.on('dragend.boxGrid', options.items, function(event) {
          if (self.dragItem && options.onDragEnd) {
            options.onDragEnd(event, self);
          }
        });

        $(document).on('dragover.boxGrid', function(event) {
          if (self.dragItem && options.onDragOver) {
            options.onDragOver(event, self);
          }
        });
      }
      else if ($.fn.hammer) {
        var dragBox = this.element.find(options.items).hammer();
        dragBox.on('dragstart', function(event) {
          var items = self.element.find(self.options.items);
          if (items.index(event.target) >=0) {
            self.dragItem = event.target;
            if (options.onDragStart) {
              options.onDragStart(event, self);
            }
          }
        });

        dragBox.on('dragend', function(event) {
          if (self.dragItem && options.onDragEnd) {
            options.onDragEnd(event, self);
          }
        });
        
        this.element.hammer().on('drag', function(event) {
          event.gesture.preventDefault();
          if (self.dragItem && options.onDragOver) {
            options.onDragOver(event, self);
          }
        });
      }
    } else {
      items.removeAttr('draggable');
      if (!is_touch_device) {
        this.element.off('dragstart.boxGrid').off('dragend.boxGrid').off('selectstart.boxGrid');
        $(document).off('dragover.boxGrid');
      } else if ($.fn.hammer) {
        var dragBox = this.element.find(options.items).hammer();
        dragBox.off('dragstart').off('dragend');
        this.element.hammer().off('drag');
      }
    }
  }

  BoxGrid.prototype.itemsInit = function(items) {
    if (this.options.onItemInit) {
      items.each(this.options.onItemInit);
    }

    if (this.options.draggable) {
      items.attr('draggable', true);
    } else {
      items.removeAttr('draggable');
    }

    items.data('inited', true);
  }

  BoxGrid.prototype.blocks = function() {
    return this.element.find('.'+this.options.blockClass);
  };

  BoxGrid.prototype.setBig = function(items, isBig) {
    items.toggleClass(this.options.bigClass, isBig);
    if (this.options.onToggleBig) {
      this.options.onToggleBig(items, isBig);
    }
  };

  BoxGrid.prototype.info = function() {
    var items = this.element.find(this.options.items);
    var itemCount = items.length;
    var bigCount = items.filter('.'+this.options.bigClass).length;
    var maxBig = 1+Math.floor((itemCount+1)/3);
    var moreItems = 3-((itemCount+1) % 3);
    return {
      itemCount: itemCount,
      bigCount: bigCount,
      maxBig: maxBig,
      moreBig: maxBig - bigCount,
      moreItems: moreItems
    };
  };

  BoxGrid.prototype.setHeight = function() {
    this.element.height(+this.element.attr('data-height') * this.options.gridHeight);
  }

  BoxGrid.prototype.redrawBlock = function(block) {
    var layouts = $.fn.boxgrid.layouts;
    var layout = +block.attr('data-layout');
    var smallBoxDraw, bigBoxDraw;

    if (layout == layouts.allSmall) {
      smallBoxDraw = BoxDrawPositions.allSmall;
    } else if (layout == layouts.bigRight) {
      bigBoxDraw = BoxDrawPositions.bigRight;
      smallBoxDraw = BoxDrawPositions.smallLeft;
    } else {
      bigBoxDraw = BoxDrawPositions.bigLeft;
      smallBoxDraw = BoxDrawPositions.smallRight;
    }

    var options = this.options;
    var blockHeight = 0;

    var blockRow = 1;
    var prevBlock = block.prev();
    if (prevBlock.length > 0) {
      blockRow = prevBlock.data('row')+prevBlock.data('height');
    }

    var items = block.find(options.items);
    items.not('.'+options.bigClass).each(function(i,box) {
      var pos = smallBoxDraw(i);
      var data = { col: 1+pos[0], row: blockRow + pos[1], blockRow: blockRow, layout: layout, index: i, size:1 };
      $.fn.boxgrid.itemDraw(box, data, options);
      blockHeight = Math.max(blockHeight, pos[1]+1);
    });

    if (bigBoxDraw) {
      items.filter('.'+options.bigClass).each(function(i,box) {
        var pos = bigBoxDraw(i);
        var data = { col: 1+pos[0], row: blockRow + pos[1], blockRow: blockRow, layout: layout, index: i, size:2 };
        $.fn.boxgrid.itemDraw(box, data, options);
        blockHeight = Math.max(blockHeight, pos[1]+2);
      });
    }

    block.data({
      row: blockRow,
      height: blockHeight
    });
  };

  BoxGrid.prototype.nearestAllSmall = function(block, preferUp) {
    var offset = preferUp ? -1 : 1;
    var layouts = $.fn.boxgrid.layouts;
    var blocks = this.element.find('.'+this.options.blockClass);
    var numBlocks = blocks.length;
    var index = block.index();
    var maxOffset = Math.max(numBlocks-1-index, index);

    var i = offset;
    var b;
    while (Math.abs(i) <= maxOffset) {
      var j = index+i;

      if (j >= 0 && j < numBlocks) {      
        b = blocks.eq(j);
        if (+b.attr('data-layout') == layouts.allSmall) {
          return b;
        }
      }

      j = index-i;
      if (j >= 0 && j < numBlocks) {      
        b = blocks.eq(j);
        if (+b.attr('data-layout') == layouts.allSmall) {
          return b;
        }
      }

      i += offset;
    }

    return $([]);
  }

  BoxGrid.prototype.bigAlign = function(block, left) {
    var options = this.options;
    var bigItems = block.find('.'+options.bigClass);
    var notAligned = false;

    if (left) {
      bigItems.each(function(i,e) {
        if ($(e).index() != i) {
          notAligned = true;
        }
      });
      if (notAligned) {
        block.prepend(bigItems);
      }
    } else {
      var bigIndexStart = block.find(options.items).length - bigItems.length;
      bigItems.each(function(i,e) {
        if ($(e).index() != bigIndexStart + i) {
          notAligned = true;
        }
      });
      if (notAligned) {
        block.append(bigItems);
      }
    }

    if (notAligned) {
      this.layoutChanged = true;
    }

    return this;
  };

  BoxGrid.prototype.detectBlockLayout = function(block) {
    var options = this.options;
    var layouts = $.fn.boxgrid.layouts;
    var layout = layouts.allSmall;
    var items = block.find(options.items);
    var bigItems = items.filter('.'+options.bigClass);
    var numBig = bigItems.length;

    // TODO: What if it doesn't fit current layout?
    if (numBig == 1) {
      if (items.length == 1) {
        layout = layouts.bigLeft;
      } else {
        if (bigItems.not('.'+options.dragClass).data('col') == 0) {
          layout = layouts.bigLeft;
        } else if (bigItems.not('.'+options.dragClass).data('col') > 0) {
          layout = layouts.bigRight;
        } else {
          if (items.eq(0).hasClass(options.bigClass)) {
            layout = layouts.bigLeft;
          } else {
            layout = layouts.bigRight;
          }
        }
      }

      this.bigAlign(block, layout == layouts.bigLeft);
      items = block.find(options.items);

      if (items.length > 2) {
        var topSmall = 0;
        var bottomSmall = 1;

        if (layout == layouts.bigLeft) {
          var topSmall = 1;
          var bottomSmall = 2;
        }

        if (+items.eq(bottomSmall).data('row') === 0 && +items.eq(topSmall).data('row') !== 0) {
          if (items.slice(topSmall,bottomSmall+1).filter('.'+options.dragClass).length == 0) {
            items.eq(topSmall).before(items.eq(bottomSmall));
          }
        }
      }
    } else if (numBig == 2) {
      layout = layouts.twoBig;
      this.bigAlign(block, true);
    } else if (numBig == 3) {
      // Invalid layout
    }

    return layout;
  };

  BoxGrid.prototype.newBlock = function() {
    return $('<'+this.options.blockElement+'>').addClass(this.options.blockClass);
  }

  BoxGrid.prototype.findSpace = function(block) {
    var options = this.options;
    var layouts = $.fn.boxgrid.layouts;
    var items = block.find(options.items);
    var bigItems = items.filter('.'+options.bigClass);
    var layout = +block.attr('data-layout');
    var space = {
      col: 1,
      size: 1
    };
    
    if (items.length >= 3) {
      return null;
    }

    if (layout == layouts.allSmall) {
      for (var i=1; i <= 3; i++) {
        if (items.filter('[data-col="'+i+'"]').length == 0) {
          space.col = i;
          break;
        }
      }
    } else {
      if (bigItems.length == 0) {
        space.size = 2;
        space.col = (layout == layouts.bigRight) ? 2 : 1;
      } else {
        if (layout == layouts.twoBig && bigItems.length == 1 && items.length == 2) {
          space.size = 2;
          space.col = 1;
        } else {
          space.col = (layout == layouts.bigRight) ? 1 : 3;
        }
      }
    }

    return space;
  }

  BoxGrid.prototype.nextBlock = function(block) {
    var nextBlock = block.next();
    while (nextBlock.length > 0 && nextBlock.find(this.options.items).length == 0) {
      nextBlock.remove();
      nextBlock = block.next();
    }
    return nextBlock;
  }

  BoxGrid.prototype.requestItems = function(block, space, isUp) {
    var options = this.options;
    var layouts = $.fn.boxgrid.layouts;
    var items = block.find(options.items).not('.'+options.dragClass);
    var bigItems = items.filter('.'+options.bigClass);
    var smallItems = items.not(bigItems);
    var layout = +block.attr('data-layout');

    if (space.size == 2) {
      if (bigItems.length > 0) {
        bigItems.sort(function(a,b) {
          aRow = +$(a).data('row');
          bRow = +$(b).data('row');
          aCol = (1+$(a).data('col')) % 3;
          bCol = (1+$(b).data('col')) % 3;

          if (aRow == bRow) {
            if (isUp) {
              return aCol - bCol; 
            } else {
              return bCol - aCol;
            }
          } else {
            return aRow - bRow;
          }
        });

        return bigItems.eq(isUp ? 0 : bigItems.length-1);
      } else {
        if (smallItems.length > 2) {
          return smallItems.slice(space.col-1, space.col+1);
        } else {
          return smallItems;
        }
      }
    } else {
      if (smallItems.length > 0) {
        if (layout == layouts.allSmall) {
          var col = space.col-1;
          if (col >= smallItems.length) {
            col = smallItems.length-1;
          }
          return smallItems.eq(col);
        } else {
          return smallItems.eq(isUp ? 0 : smallItems.length-1);
        }
      } else {
        return bigItems.eq(isUp ? 0 : bigItems.length-1);
      }
    }
  }

  BoxGrid.prototype.updateBlock = function(block, isUp) {
    var options = this.options;
    var layouts = $.fn.boxgrid.layouts;
    var layout = null;
    if (block.attr('data-layout')) {
      layout = +block.attr('data-layout');
    }

    var items = block.find(options.items);
    var bigItems = items.filter('.'+options.bigClass);
    var smallItems = items.not(bigItems);
    var numBig = bigItems.length;
    var nextBlock = this.nextBlock(block);

    var maxBigItems = 1;
    if (nextBlock.length == 0) {
      maxBigItems = 2;
    }

    // Find a space for the extra big items
    if (bigItems.length > maxBigItems) {
      this.layoutChanged = true;

      var isBigUp = true;
      if (bigItems.each(function(i,e) {
        if ($(e).data('row') == 1) {
          isBigUp = false;
        }
      }));
      var nearestAllSmall = this.nearestAllSmall(block, isBigUp);
      var targetIndex = nearestAllSmall.index();
      var currentIndex = block.index();

      if (targetIndex >= 0 && targetIndex < currentIndex) {
        // Move upward
        blocks = this.element.find('.'+options.blockClass);
        for (var i = targetIndex; i < currentIndex; i++) {
          var big = this.requestItems(blocks.eq(i+1), {size: 2}, true);
          this.updateBlock(blocks.eq(i).prepend(big));
        }
      } else {
        if (nextBlock.length == 0) {
          // Create a new block
          nextBlock = this.newBlock().appendTo(this.element);
        }

        nextBlock.prepend(this.requestItems(block, {size: 2}, false).data('row', -1));
      }
    }

    // Pull up items to fill space
    var space = this.findSpace(block);
    while (space) {
      if (isUp) {
        nextBlock = this.nextBlock(block);
      } else {
        nextBlock = block.prev();
      }

      var newItems = this.requestItems(nextBlock, space, isUp);

      if (newItems.length == 0) {
        break;
      }

      this.layoutChanged = true;
      newItems.data('row', -1);
      if ((layout == layouts.allSmall && +nextBlock.attr('data-layout') == layouts.bigRight)
        || ((layout == layouts.bigLeft || layout == layouts.twoBig) && space.size == 2)) {
        block.prepend(newItems);
      } else {
        if (layout == layouts.allSmall) {
          items = block.find(options.items);
          var insertPoint = Math.min(+newItems.data('col')-1, items.length-1);
          if (insertPoint < 0) {
            block.prepend(newItems);  
          } else {
            items.eq(insertPoint).after(newItems);
          }
        } else {
          if (isUp || space.size == 2) {
            block.append(newItems);
          } else {
            block.prepend(newItems);
          }
        }
      }

      if (space.size == 2 && newItems.length == 2) {
        nextBlock.attr('data-layout', layout);
        var missing = 2-items.length;
        if (missing < 2) {
          if (isUp) {
            if (layout == layouts.bigLeft) {
              nextBlock.find(options.items).eq(1).before(smallItems.last().data('row', 0));
            } else {
              nextBlock.prepend(smallItems.last().data('row', 0));
            }
          } else {
            nextBlock.append(smallItems.first().data('row', 0));
          }
        } else {
          if (isUp) {
            nextBlock.append(newItems.first().data('row', 0));
          } else {
            nextBlock.append(newItems.last().data('row', 0));
          }
        }
      }

      if (isUp === undefined) {
        space = this.findSpace(block);
      } else {
        break;
      }     
    }

    items = block.find(options.items);
    bigItems = items.filter('.'+options.bigClass);
    smallItems = items.not(bigItems);
    if (items.length > 3) {
      this.layoutChanged = true;

      nextBlock = this.nextBlock(block);
      if (nextBlock.length == 0) {
        // Create a new block
        nextBlock = this.newBlock().appendTo(this.element);
      }

      if (bigItems.length > 1) {
        // Move extra big items to next block
        nextBlock.prepend(bigItems.slice(1, bigItems.length).data('row', -1));
      } else {
        // Move last item to the next block
        nextBlock.prepend(items.slice(3, items.length).data('row', -1));
      }
    }

    block.attr('data-layout', this.detectBlockLayout(block));
  };

  BoxGrid.prototype.update = function() {
    var blocks;
    var self = this;
    var options = this.options;
    var items = this.element.find(options.items);
    var bigItems = items.filter('.'+options.bigClass);

    items.each(function(i,e) {
      var item = $(e);
      if ( ! item.data('inited')) {
        self.itemsInit(item);
      }
    });

    items.data('inited', true);

    // Clear extra big items
    var info = this.info();
    if (info.moreBig < 0) {
      this.setBig(bigItems.slice(info.moreBig), false);
    }

    // Update first, then redraw
    var i = 0;
    while ((blocks = this.blocks()) && i < blocks.length) {
      var block = blocks.eq(i);
      if (block.find(options.items).length == 0) {
        block.remove();
        continue;
      }
      this.updateBlock(block, true);
      i++;
    }

    this.redraw();

    if (this.layoutChanged) {
      this.layoutChanged = false;
      setTimeout(function() {
        self.element.trigger('change');
        if (self.options.onChange) {
          self.options.onChange();
        }
      }, 1);
    }
  };

  BoxGrid.prototype.redraw = function() {
    var self = this;
    var blocks = this.blocks();
    setTimeout(function() {
      blocks.each(function (i, block) {
        self.redrawBlock($(block));
      });
      var lastBlock = blocks.last();
      var height = lastBlock.data('row') + lastBlock.data('height') - 1;
      self.element.attr('data-height', height);
      if (self.options.autoHeight) {
        self.setHeight();
      }
    }, 1);
  }

  BoxGrid.prototype.moveItem = function(item, col, row) {
    if (this.moving) {
      return false;
    }
    this.moving = true;

    var self = this;
    var item = $(item);
    if (+item.attr('data-col') == col && +item.attr('data-row') == row) {
      this.moving = false;
      return false;
    }

    var layouts = $.fn.boxgrid.layouts;
    var blocks = this.blocks();
    var size = item.hasClass(this.options.bigClass) ? 2 : 1;
    var sourceBlock = item.parent();
    var sourceIndex = sourceBlock.index();
    var targetBlock = blocks.first();
    var targetIndex = 0;
    var midPos = row + (size / 2);

    if (size == 2) {
      for (var i = 1; i < blocks.length; i++) {
        var topBlock = blocks.eq(i-1);
        var bottomBlock = blocks.eq(i);
        var crossLine = (topBlock.data('row') + bottomBlock.data('row') + bottomBlock.data('height')) / 2;
        
        if (midPos < crossLine) {
          break;
        }

        targetBlock = bottomBlock;
        targetIndex = i;
      }
    } else {
      for (var i = 1; i < blocks.length; i++) {
        var block = blocks.eq(i);

        if (row < block.data('row')) {
          break;
        }

        targetBlock = block;
        targetIndex = i;
      }
    }

    var targetHTML = targetBlock.html();
    var targetLayout = +targetBlock.attr('data-layout');

    if (size == 2) {
      if (targetLayout == layouts.twoBig) {
        if (midPos > targetBlock.data('row')+2) {
          targetBlock.append(item);
        } else {
          targetBlock.prepend(item);
        }
      } else {
        if (targetIndex == sourceIndex) {
          if (col <= 1) {
            this.bigAlign(targetBlock, true);
          } else {
            this.bigAlign(targetBlock, false);
          }
        } else {
          this.layoutChanged = true;
          if (col <= 1) {
            targetBlock.prepend(item);
          } else {
            targetBlock.append(item);
          }
        }
      }
    } else {
      var smallItems = targetBlock.find(this.options.items).not('.'+this.options.bigClass);
      var bigItems = targetBlock.find(this.options.items).filter('.'+this.options.bigClass);
      if (targetLayout == layouts.allSmall) {
        if (+item.attr('data-col') > col) {
          smallItems.eq(col-1).before(item);
        } else {
          smallItems.eq(col-1).after(item);
        }
      } else {
        if (targetIndex == sourceIndex && targetLayout == layouts.bigLeft && col == 1) {
          bigItems.data('col', 2);
        } else if (targetIndex == sourceIndex && targetLayout == layouts.bigRight && col == 3) {
          bigItems.data('col', 0);
        } else {
          if (row == +targetBlock.data('row')) {
            smallItems.first().before(item);
          } else {
            smallItems.last().after(item);
          }
        }
      }
    }

    var direction = sourceIndex > targetIndex ? -1 : 1;
    for (var i=sourceIndex; i != targetIndex; i+=direction) {
      this.updateBlock(blocks.eq(i), direction == 1);
    }

    this.updateBlock(targetBlock, direction == 1);
    if (sourceIndex != targetIndex || targetBlock.html() != targetHTML) {
      this.layoutChanged = true;
      this.moving = false;
      return true;
    }

    self.moving = false;
    return false;
  };

  BoxGrid.prototype.layout = function() {
    var self = this;
    var layout = [];
    var items = this.element.find(this.options.items);
    items.each(function (i,e) {
      layout.push({
        id: $(e).attr('id'),
        big: $(e).hasClass(self.options.bigClass)
      });
    });
    return layout;
  };

  $.fn.boxgrid = function(options, param) {
    if (typeof(options) == 'string') {
      var boxGrid = this.data('boxgrid');
      switch (options) {
        case 'option':
          boxGrid.option(param);
        break;
        case 'update':
          boxGrid.update();

        break;
        case 'info':
          return boxGrid.info();
        break;
        case 'layout':
          return boxGrid.layout();
        break;
      }
      return this;
    }

    if (this.data('boxgrid')) {
      return this;
    }

    var opts = $.extend({}, $.fn.boxgrid.defaults, options);
    this.data('boxgrid', new BoxGrid(this, opts));
    return this;
  };

  $.fn.boxgrid.defaults = {
    autoHeight: true,
    bigClass: 'box-featured',
    blockElement: 'div',
    blockClass: 'block',
    dragClass: 'dragging',
    draggable: false,
    gridHeight: 80,
    gridWidth: 100,
    gutterSize: 10,
    items: '.box',
    onChange: null,
    onItemInit: null,
    onToggleBig: null,
    onDragStart: function(event, ui) {
      event.originalEvent = event.originalEvent || {};
      event.originalEvent.effectAllowed = 'none';
      if (event.originalEvent.dataTransfer) {
        event.originalEvent.dataTransfer.setData('text', 'work');
      }
      
      var pos = $(event.target).addClass(ui.options.dragClass).offset();

      var pageX = event.originalEvent.pageX;
      var pageY = event.originalEvent.pageY;

      if (event.gesture) {
        pageX = event.gesture.center.pageX;
        pageY = event.gesture.center.pageY; 
      }
      ui.dragOffset = {
        x: pos.left - pageX,
        y: pos.top - pageY
      };
    },
    onDragEnd: function(event, ui) {
      $(ui.dragItem).removeClass(ui.options.dragClass);
      ui.dragItem = null;
      if (ui.layoutChanged) {
        ui.layoutChanged = false;
        setTimeout(function() {
          ui.element.trigger('change');
          if (ui.options.onChange) {
            ui.options.onChange();
          }
        }, 1);
      }
    },
    onDragOver: function(event, ui) {
      /*if (event.originalEvent.clientY < event.originalEvent.pageY) {
        // scroll up?
        $('html, body').animate({
          scrollTop: ui.element.offset().top
        }, 1500);
      }*/
      var pos = ui.element.offset();

      event.originalEvent = event.originalEvent || {};
      var pageX = event.originalEvent.pageX;
      var pageY = event.originalEvent.pageY;

      if (event.gesture) {
        pageX = event.gesture.center.pageX;
        pageY = event.gesture.center.pageY; 
      }

      var x = pageX + ui.dragOffset.x - pos.left;
      var y = pageY + ui.dragOffset.y - pos.top;

      var blocks = ui.blocks();
      var lastBlock = blocks.last();
      var maxRow = lastBlock.data('row') + lastBlock.data('height') - 1;
      var col = 1+Math.round(x / ui.options.gridWidth);
      if (col < 1) col = 1;
      if (col > 3) col = 3;
      
      var row = 1+Math.round(y / ui.options.gridHeight);
      if (row < 1) row = 1;
      if (row > maxRow) {
        row = maxRow;
      }
      
      //console.log(col, row);
      if (ui.moveItem(ui.dragItem, col, row)) {
        ui.redraw();
      }
    }
  };

  $.fn.boxgrid.layouts = {
    allSmall: 0,
    bigLeft: 1,
    bigRight: 2,
    twoBig: 3
  };

  $.fn.boxgrid.itemDraw = function(element, data, options) {
    $(element)
      .attr('data-col', data.col)
      .attr('data-row', data.row)
      .attr('data-size', data.size)
      .data('col', data.col-1)
      .data('row', data.row-data.blockRow);

    // Moved from less file to js to allow dynamic changes
    boxWidth = options.gridWidth - options.gutterSize;
    boxHeight = options.gridHeight - options.gutterSize;

    if (data.size == '2') {
      boxWidth = (options.gridWidth * 2) - options.gutterSize;
      boxHeight = (options.gridHeight * 2) - options.gutterSize; 
    }

    if (data.col === 0) {
      data.col = 1;
    }
    if (data.row === 0) {
      data.row = 1;
    }
    leftOffset = options.gridWidth * (data.col - 1);
    topOffset = options.gridHeight * (data.row - 1);

    if (window.innerWidth < 768)  boxHeight = 'auto'; // #10/17 DJsa, added this for mobile sizes. If we want to abstract this logic out into an option later we can.

    $(element).css({
      width: boxWidth,
      height: boxHeight,
      left: leftOffset,
      top: topOffset
    });
  };
}(jQuery));
