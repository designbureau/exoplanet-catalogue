/**
 * Plasmic Audio Player PACKAGED v:1.0
 * Display Object.
 * @author Tibi - FWDesign [https://webdesign-flash.ro/]
 * Copyright © Since 2006 All Rights Reserved.
 */

import FWDDSEventDispather from "./FWDDSEventDispather";

export default class FWDDSDisplayObject extends FWDDSEventDispather{

   
    // Initialize.
    constructor(type = "div",
        transformType = "3d",
        position = "absolute",
        overflow = "hidden",
        display = "block"
    ){
        super();
        
        this._type = type;
        this._transformType = transformType;
        this._position = position;
        this._overflow = overflow;
        this._display = display;
        this._parent = undefined;
       
        this.children = [];
        this._innerHTML = '';
        this._width = this.w = 0;
        this._height = this.h = 0;
        this._x = 0;
        this._y = 0;
        this._scale = 1;
        this._rotation = 0;
        this._opacity = this.alpha = 1;
    
        // Initialize object.
        this.screen = undefined;
        this.setProperties();
    }


    // Set main properties.
    setProperties(){
        this.position = this._position;
        this.style.overflow = this._overflow;
        this.style.left = "0px";
	    this.style.top = "0px";
	    this.style.margin = "0px";
		this.style.padding = "0px";
	    this.style.maxWidth = "none";
	    this.style.maxHeight = "none";
	    this.style.border = "none";
	    this.style.lineHeight = "1";
        this.style.backfaceVisibility = "hidden";
        this.style.boxSizing = 'border-box';

        if(this.type == "img"){
            this.width = this.width;
            this.Heigh = this.height;
            this.screen.onmousedown = function(e){return false;};
        }
    }


    // Screen.
    set screen(element){
        if(this._type == 'img' && element){
            this._screen = element;
        }else{
            this._screen = document.createElement(this._type);
        }
        this.setProperties();
    }

    get screen(){
         return this._screen;
    }

    // Typchild.
    get type(){
        return this._type;
    }

    // Transform typchild.
    get transformType(){
        return this._transformType;
    }

    set transformType(transformType){
        this._transformType = transformType;
    }


    // Inner HTML.
    get innerHTML(){
        return this._innerHTML;
    }

    set innerHTML(innerHTML){
        this._innerHTML = innerHTML
        this.screen.innerHTML = this._innerHTML;
    }


    // Stylchild.
    get style(){
        return this.screen.style;
    }


    // Position.
    get position(){
        return this._position;
    }

    set position(position){
        this.style.position = position;
        this._position = position;
    }


    // Width & height.
    get width(){
        if(this.screen.offsetWidth != 0) return this.screen.offsetWidth;
        if(this.type == "img"){
            if(this.screen.width != 0) return this.screen.width;
        }
        return this._width;
    }

    set width(width){
        this._width = width;
        this.w = width
       
        if(this.type == "img" || this.type == 'canvas'){
            this.screen.width = this._width;
        }
        this.style.width = this._width + "px";
    }

    setWidth(width){
        this.width = width;
    }

    get height(){
        if(this.screen.offsetHeight != 0) return this.screen.offsetHeight;
        if(this.type == "img"){
            if(this.screen.height != 0) return this.screen.height;
        }
        return this._height;
    }

    set height(height){
        this._height = height;
        this.h = height
       
        if(this.type == "img" || this.type == 'canvas'){
            this.screen.height = this._height;
        }
        this.style.height = this._height + "px";
    }

    setHeight(height){
        this.height = height;
    }


    // Rotation.
    get rotation(){
        return this._rotation;
    }

    set rotation(angle){
        this._rotation = angle;
        this.setGeometry();
    }
    

    // Opacity.
    get opacity(){
        return this._opacity;
    }

    set opacity(opacity){
        this._opacity = this.alpha = opacity
        this.style.opacity = this._opacity;
    }

    setAlpha(opacity){
        this.opacity = opacity;
    }


    // X & Y.
    get x(){
        return this._x;
    }

    set x(x){
        this._x = x;
        this.setGeometry();
    }

    setX(x){
        this.x = x;
    }

    get y(){
        return this._y;
    }

    set y(y){
        this._y = y;
        this.setGeometry();
    }

    setY(y){
        this.y = y;
    }

   
    // Scalchild.
    get scale(){
        return this._scale;
    }

    set scale(scale){
        this._scale = scale;
        this.setGeometry();
    }

    setScale2(scale){
        this.scale = scale;
    }


    // Set position, rotation and scalchild.
    setGeometry(){
        if(this.transformType == "2d"){
            this.style.transform = "translate(" + this.x + "px," + this.y + "px) scale(" + this.scale + " , " + this.scale + ") rotate(" + this.rotation + "deg)";
        }else if(this.transformType == "3d"){
            this.style.transform = "translate3d(" + this.x + "px," + this.y + "px,0) scale(" + this.scale + " , " + this.scale + ") rotate(" + this.rotation + "deg)";
        }else{
            this.style.left = this.x + 'px';
            this.style.top = this.y + 'px';
            this.style.transform = "scale(" + this.scale + " , " + this.scale + ") rotate(" + this.rotation + "deg)";
        }
    }


    // Display object container.
    addChild(child) {
        if(child.parent) {
            child.parent.removeChild(child);
        }
        this.children.push(child);
        this.screen.appendChild(child.screen);
        child.parent = this;
        return this;
    }

    addChildAt(child, index) {
        if (child.parent) {
            child.parent.removeChild(child);
        }
        this.children.splice(index, 0, child);
        
        if(index == this.numChildren() - 1){
            this.screen.appendChild(child.screen);
        }else{
            this.screen.insertBefore(child.screen, this.children[index + 1].screen);
        }
        child.parent = this;
        return this;
    }

    removeChild(child) {
        let index = this.getChildIndex(child);
        if (index !== -1) {
            this.children.splice(index, 1);
        }
       
        this.screen.removeChild(child.screen);
        child.parent = null;
        return this;
    }

    removeChildren(){
        while (this.numChildren() > 0) {
            this.removeChild(this.children.pop());
        }
        return this;
    };

    numChildren(){
        return this.children.length; 
    }

    contains(child) {
        return this.children.includes(child);
    }

    getChildIndex(child){
        return this.children.indexOf(child);
    }

    getChildAt(index){
        return this.children[index];
    };

    get parent(){
        return this._parent;
    }

    set parent(parent){
        this._parent = parent;
    }
    
    get rect(){
        return this.screen.getBoundingClientRect();
    }
}