Mavens Social Interactions
==========================

Mavens Of London Front End Developer Assessment


[Demo](http://yunda.github.io/mavens-social-interactions)


### Maintain

I use [Browserify](http://browserify.org/) on this project. So if you want to put some cahnges you'll have to install it.

```
npm install -g browserify
```

To build the project run next command from the project folder.

```
browserify js/app.js -o static/bundle.js
```

If you're on Mac use

```
npm run build
```

You can also watch the chages, but you gonna need [Watchify](https://github.com/substack/watchify) for this

```
npm install -g watchify

watchify js/app.js -o static/bundle.js --debug --verbose
```

or for Mac users

```
npm run watch
```


### Tools used

* Mac OS
* Sublime Text 2
* Sketch
