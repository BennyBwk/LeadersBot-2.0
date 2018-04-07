run: node_modules
	node --harmony --require babel-register index.js

node_modules:
	npm install
