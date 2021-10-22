#!/bin/bash
#
# This script packages your project into a solution distributable that can be
# used as an input to the solution builder validation pipeline.
#
# Important notes and prereq's:
#   1. The initialize-repo.sh script must have been run in order for this script to
#      function properly.
#   2. This script should be run from the repo's /deployment folder.
#
# This script will perform the following tasks:
#   1. Remove any old dist files from previous runs.
#   2. Install dependencies for the cdk-solution-helper; responsible for
#      converting standard 'cdk synth' output into solution assets.
#   3. Build and synthesize your CDK project.
#   4. Run the cdk-solution-helper on template outputs and organize
#      those outputs into the /global-s3-assets folder.
#   5. Organize source code artifacts into the /regional-s3-assets folder.
#   6. Remove any temporary files used for staging.
#
# Parameters:
#  - source-bucket-base-name: Name for the S3 bucket location where the template will source the Lambda
#    code from. The template will append '-[region_name]' to this bucket name.
#    For example: ./build-s3-dist.sh solutions v1.0.0
#    The template will then expect the source code to be located in the solutions-[region_name] bucket
#  - solution-name: name of the solution for consistency
#  - version-code: version of the package

["$DEBUG" == 'true' ] && set -x
set -e

# Important: CDK global version number
cdk_version=1.117.0

# Check to see if the required parameters have been provided:
if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ] || [ -z "$4" ]; then
    echo "Please provide the base source bucket name, trademark approved solution name and version where the lambda code will eventually reside."
    echo "For example: ./build-s3-dist.sh solutions trademarked-solution-name v1.0.0 solutions-reference"
    exit 1
fi

# Get reference for all important folders
template_dir="$PWD"
staging_dist_dir="$template_dir/staging"
template_dist_dir="$template_dir/global-s3-assets"
build_dist_dir="$template_dir/regional-s3-assets"
backend_source_dir="$template_dir/../source/backend"
frontend_source_dir="$template_dir/../source/frontend"

echo "------------------------------------------------------------------------------"
echo "[Init] Remove any old dist files from previous runs"
echo "------------------------------------------------------------------------------"

echo "rm -rf $template_dist_dir"
rm -rf $template_dist_dir
echo "mkdir -p $template_dist_dir"
mkdir -p $template_dist_dir
echo "rm -rf $build_dist_dir"
rm -rf $build_dist_dir
echo "mkdir -p $build_dist_dir"
mkdir -p $build_dist_dir
echo "rm -rf $staging_dist_dir"
rm -rf $staging_dist_dir
echo "mkdir -p $staging_dist_dir"
mkdir -p $staging_dist_dir

echo "------------------------------------------------------------------------------"
echo "[Init] Install dependencies for the cdk-solution-helper"
echo "------------------------------------------------------------------------------"

echo "cd $template_dir/cdk-solution-helper"
cd $template_dir/cdk-solution-helper
echo "npm install"
npm install

echo "------------------------------------------------------------------------------"
echo "[Synth] CDK Project"
echo "------------------------------------------------------------------------------"

# Install the global aws-cdk package
echo "cd $backend_source_dir"
cd $backend_source_dir
echo "npm install -g aws-cdk@$cdk_version"
npm install -g aws-cdk@$cdk_version

echo "npm install"
npm install

echo "npm install for lambda"
cd lambda
npm install
cd ..

# Run 'cdk synth' to generate raw solution outputs
echo "cdk synth --output=$staging_dist_dir"
cdk synth --output=$staging_dist_dir

# Remove unnecessary output files
echo "cd $staging_dist_dir"
cd $staging_dist_dir
echo "rm tree.json manifest.json cdk.out"
rm tree.json manifest.json cdk.out

echo "------------------------------------------------------------------------------"
echo "[Packing] Template artifacts"
echo "------------------------------------------------------------------------------"

# Move outputs from staging to template_dist_dir
echo "Move outputs from staging to template_dist_dir"
echo "cp $template_dir/*.template $template_dist_dir/"
cp $staging_dist_dir/*.json $template_dist_dir/
rm *.json

# Rename all *.template.json files to *.template
echo "Rename all *.template.json to *.template"
echo "copy templates and rename"
for f in $template_dist_dir/*.template.json; do
    mv -- "$f" "${f%.template.json}.template"
done

# Run the helper to clean-up the templates and remove unnecessary CDK elements
echo "Run the helper to clean-up the templates and remove unnecessary CDK elements"
echo "node $template_dir/cdk-solution-helper/index"
node $template_dir/cdk-solution-helper/index
if [ "$?" = "1" ]; then
    echo "(cdk-solution-helper) ERROR: there is likely output above." 1>&2
    exit 1
fi

# Find and replace bucket_name, solution_name, and version
echo "Find and replace bucket_name, solution_name, and version"
cd $template_dist_dir
echo "Updating code source bucket in template with $1"
replace="s/%%BUCKET_NAME%%/$1/g"
echo "sed -i -e $replace $template_dist_dir/*.template"
sed -i -e $replace $template_dist_dir/*.template
replace="s/%%SOLUTION_NAME%%/$2/g"
echo "sed -i -e $replace $template_dist_dir/*.template"
sed -i -e $replace $template_dist_dir/*.template
replace="s/%%VERSION%%/$3/g"
echo "sed -i -e $replace $template_dist_dir/*.template"
sed -i -e $replace $template_dist_dir/*.template
replace="s/%%TEMPLATE_OUTPUT_BUCKET%%/$4/g"
echo "sed -i -e $replace $template_dist_dir/*.template"
sed -i -e $replace $template_dist_dir/*.template

echo "------------------------------------------------------------------------------"
echo "[Packing] Source code artifacts (backend)"
echo "------------------------------------------------------------------------------"

# General cleanup of node_modules and package-lock.json files
echo "find $staging_dist_dir -iname "node_modules" -type d -exec rm -rf "{}" \; && true"
find $staging_dist_dir -iname "node_modules" -type d -exec rm -rf "{}" \; && true

# ... For each asset.* source code artifact in the temporary /staging folder...
cd $staging_dist_dir
for d in `find . -mindepth 1 -maxdepth 1 -type d`; do

    # Rename the artifact, removing the period for handler compatibility
    pfname="$(basename -- $d)"
    fname="$(echo $pfname | sed -e 's/\.//g')"
    echo "zip -r $fname.zip $fname"
    mv $d $fname

    # Build the artifcats
    if ls $fname/*.py 1> /dev/null 2>&1; then
        echo "===================================="
        echo "This is Python runtime"
        echo "===================================="
        cd $fname
        venv_folder="./venv-prod/"
        rm -fr .venv-test
        rm -fr .venv-prod
        echo "Initiating virtual environment"
        python3 -m venv $venv_folder
        source $venv_folder/bin/activate
        pip3 install -q -r requirements.txt --target .
        deactivate
        cd $staging_dist_dir/$fname/$venv_folder/lib/python3.*/site-packages
        echo "zipping the artifact"
        zip -qr9 $staging_dist_dir/$fname.zip .
        cd $staging_dist_dir/$fname
        zip -gq $staging_dist_dir/$fname.zip *.py util/*
        cd $staging_dist_dir
    elif ls $fname/*.js 1> /dev/null 2>&1; then
        echo "===================================="
        echo "This is Node runtime"
        echo "===================================="
        cd $fname
        if ls package-lock.json 1>/dev/null 2>&1; then
            echo "Clean and rebuild artifacts"
            npm ci
            if [ "$?" = "1" ]; then
                echo "ERROR: Seems like package-lock.json does not exists or is out of sync with package.json. Trying npm install instead" 1>&2
                npm install
            fi
        fi
        cd $staging_dist_dir
        # Zip the artifact
        cd $fname
        echo "zip -rq ../$fname.zip *"
        zip -rq ../$fname.zip *
        cd ..
    fi

    # Copy the zipped artifact from /staging to /regional-s3-assets
    echo "cp $fname.zip $build_dist_dir"
    cp $fname.zip $build_dist_dir

    # Remove the old, unzipped artifact from /staging
    echo "rm -rf $fname"
    rm -rf $fname

    # Remove the old, zipped artifact from /staging
    echo "rm $fname.zip"
    rm $fname.zip

    # ... repeat until all source code artifacts are zipped and placed in the
    # ... /regional-s3-assets folder

done

echo "------------------------------------------------------------------------------"
echo "[Packing] Source code artifacts (frontend)"
echo "------------------------------------------------------------------------------"

# Build frontend application
echo "cd $frontend_source_dir"
cd $frontend_source_dir
echo "npm install"
npm install
echo "npm run build"
npm run build

# Move UI files to /regional-s3-assets
cp ./build/ui.zip $build_dist_dir/ui.zip

echo "------------------------------------------------------------------------------"
echo "[Cleanup] Remove temporary files"
echo "------------------------------------------------------------------------------"

# Delete the temporary /staging folder
echo "rm -rf $staging_dist_dir"
rm -rf $staging_dist_dir
