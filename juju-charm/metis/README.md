# Overview

Metis is an open source and highly robust JSON distributed storage solution for modern devices and services. It allows you to have your modern applications, such as ChromeOS
apps, Cordova / PhoneGap mobile apps, and your website, easily share data through a common set of APIs. Metis can also be leveraged through the PHP library to provide a
reliable method for storing, retrieving, and replicating data.

## What does the Metis Juju Charm do?

The Metis Juju Charm is an easy way to deploy the Metis (php) backend. This backend can then be leveraged by Chrome / ChromeOS apps, mobile HTML5 apps, and your website
by pointing those frontends to the domain or I.P. address that Juju exposes to you.

## Want to learn more?

You can learn about using Metis for your frontend and backend applications by going to our [wiki](http://wiki.metisdb.org).

# Installation / Deploying

## Requirements

To deploy this charm, you will need at least: an http server (whether it be apache or nginx) that has access to executing PHP, a working Juju installation and a successful bootstrap.

## Initial Configuration

By default, Metis will download / check for dependencies relating to nginx. If you are wanting to deploy Metis on an apache server, modify the config.yaml engine to "apache2".

## Deploying

Once bootstrapped and you have modified the configuration if necessary, deploy the Metis charm by doing:
	juju deploy metis

When you deploy Metis, it will:

- Check if nginx or apache2 is installed. If not, it will automatically download nginx.
- Check if the necessary PHP libraries are installed (primarily php5 and php5 CURL). If not, it will automatically download those dependencies.
- Download the latest Metis version via Git and installs into /var/www/Metis.

## Detailed Configuration

Before exposing Metis, you will need to modify the nodeList.json file in /var/www/Metis as well as create the necessary folders in /var/www/Metis/data.
You can read more about setting up the Metis backend [here](https://github.com/StroblIndustries/Metis/wiki/Setting-Up-The-Backend).

# Exposing Metis

After you have modified the nodeList.json file and created the necessary folders within /var/www/Metis/data/, you are welcome to expose the Metis service by doing the following:
	juju expose metis

All done! You've now deployed Metis on your juju system

# Find a bug or have feedback?

If you have found a bug, issue, or wanting to file feature requests, you can do so at https://github.com/StroblIndustries/Metis/issues
