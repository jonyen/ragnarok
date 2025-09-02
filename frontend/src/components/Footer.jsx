import React from 'react';
import { FileText, Github, Twitter, Linkedin } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 mt-16">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <FileText className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                Ragnarok
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Universal document analysis powered by AI. Upload any file, get intelligent insights.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              Product
            </h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li><a href="/features" className="hover:text-indigo-600 dark:hover:text-indigo-400">Features</a></li>
              <li><a href="/pricing" className="hover:text-indigo-600 dark:hover:text-indigo-400">Pricing</a></li>
              <li><a href="/api" className="hover:text-indigo-600 dark:hover:text-indigo-400">API</a></li>
              <li><a href="/integrations" className="hover:text-indigo-600 dark:hover:text-indigo-400">Integrations</a></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              Support
            </h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li><a href="/docs" className="hover:text-indigo-600 dark:hover:text-indigo-400">Documentation</a></li>
              <li><a href="/help" className="hover:text-indigo-600 dark:hover:text-indigo-400">Help Center</a></li>
              <li><a href="/contact" className="hover:text-indigo-600 dark:hover:text-indigo-400">Contact</a></li>
              <li><a href="/status" className="hover:text-indigo-600 dark:hover:text-indigo-400">Status</a></li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              Connect
            </h3>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400">
                <Github className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400">
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            © 2024 Ragnarok. All rights reserved.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="/privacy" className="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400">
              Privacy Policy
            </a>
            <a href="/terms" className="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;