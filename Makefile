test:
	node_modules/.bin/promises-aplus-tests test/aplus-tests-adapter.js

lint:
	jshint --show-non-errors tillthen.js test/aplus-tests-adapter.js

.PHONY: test lint