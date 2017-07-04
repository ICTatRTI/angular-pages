#!/bin/bash
CLI_DIR=$1
PROJECT_DIR=$PWD

# Remove previously created pages module and regenerate it..
rm -r "$PROJECT_DIR/src/app/pages"
cd "$PROJECT_DIR/src/app" && ng generate module --routing pages 

# Get all MD file paths.
cd "$PROJECT_DIR/src/pages"
index=0
for x in `find ./ * | grep -v "code\/" | grep -v "\.\/\/" | grep ".md"`; do
    MD_PATHS[$index]="$x"
    index=$(($index+1))
done 
cd 

# Convert them all to HTML
cd "$PROJECT_DIR/src/pages"
index=0
for MD_PATH in "${MD_PATHS[@]}"
do
  :
  HTML_PATH=`echo $MD_PATH | sed -e 's/.md/.html/'` 
	echo "Transpiling Markdown at $MD_PATH to HTML at $HTML_PATH"
  cat "$MD_PATH" | mdown > "$HTML_PATH"
	index=$(($index+1))
done

# Get all HTML file paths.
cd "$PROJECT_DIR/src/pages"
index=0
for x in `find ./ * | grep -v "code\/" | grep -v "\.\/\/" | grep ".html"`; do
    HTML_PATHS[$index]="$x"
    index=$(($index+1))
done 

# TODO: Transpile anchor tags into NG Router links.

# Generate a Component and Route for each HTML file.
index=0
for HTML_PATH in "${HTML_PATHS[@]}"
do
  :

  # Generate the Component's machine name for the file system. Convert forward slashes to double dashes. 
  COMPONENT_MACHINE_NAME=`echo $HTML_PATH | sed -e 's/.html//' | sed -e 's/\//--/'`

  # ESCAPED_MD_PATH=`echo "$MD_PATH" | sed -e ''`

  # Generate the Component.
  cd "$PROJECT_DIR/src/app/pages"
  ng generate component $COMPONENT_MACHINE_NAME

  # Get the Component's Class Name that ng generated.
  COMPONENT_CLASS_NAME=`cat "$PROJECT_DIR/src/app/pages/$COMPONENT_MACHINE_NAME/$COMPONENT_MACHINE_NAME.component.ts" | tail -n 1 | awk '{print $3}'`

  # Copy the HTML file to Component's HTML file.
  cp "$PROJECT_DIR/src/pages/$HTML_PATH" "$PROJECT_DIR/src/app/pages/$COMPONENT_MACHINE_NAME/$COMPONENT_MACHINE_NAME.component.html"

  # Edit Pages Module's routing to ES6 import Component.
  cd $PROJECT_DIR
  echo "import { $COMPONENT_CLASS_NAME } from './$COMPONENT_MACHINE_NAME/$COMPONENT_MACHINE_NAME.component';" > tmp
  cat "$PROJECT_DIR/src/app/pages/pages-routing.module.ts" >> tmp
  mv tmp "$PROJECT_DIR/src/app/pages/pages-routing.module.ts"

  # Edit routing of the Pages Module to declare route for Component.
  cd $PROJECT_DIR
  cat "$PROJECT_DIR/src/app/pages/pages-routing.module.ts" | sed -e "s#const routes# const routes \: Routes \ = \[ \\n\{ path\: '$HTML_PATH', component\: $COMPONENT_CLASS_NAME \}\] \/\/#" > tmp
  mv tmp "$PROJECT_DIR/src/app/pages/pages-routing.module.ts"
	index=$(($index+1))
done

# TODO: Add the index component to the '' route.
