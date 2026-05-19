from flask import Flask, render_template, request, send_file
import datetime
from jinja2 import Template
import pdfkit

app = Flask(__name__)

# 模拟数据库
contracts = {}

@app.route('/')
def index():
    return render_template('submit.html')

@app.route('/submit', methods=['POST'])
def submit_contract():
    contract_data = {
        'title': request.form['title'],
        'content': request.form['content'],
        'department': request.form['department'],
        'status': '科长审核中'
    }
    
    # 生成合同编号: 部门+年月+序列
    year_month = datetime.datetime.now().strftime("%Y%m")
    seq_num = len(contracts) + 1
    contract_id = f"{contract_data['department']}-{year_month}-{seq_num:04d}"
    
    contracts[contract_id] = contract_data
    return render_template('status.html', contract_id=contract_id)

@app.route('/generate_pdf/<contract_id>')
def generate_pdf(contract_id):
    from pdfkit.configuration import Configuration
    config = Configuration(wkhtmltopdf=r'C:\Program Files\wkhtmltopdf\bin\wkhtmltopdf.exe')
    # 添加路径验证和异常处理
    if not os.path.exists(config.wkhtmltopdf):
        raise FileNotFoundError(f"wkhtmltopdf executable not found at {config.wkhtmltopdf}")
    if not os.access(config.wkhtmltopdf, os.X_OK):
        raise PermissionError(f"No execute permission for {config.wkhtmltopdf}")
    contract = contracts.get(contract_id)
    if contract:
        rendered = render_template('contract_template.html', **contract)
        pdf = pdfkit.from_string(rendered, False, configuration=config)
        return send_file(
            pdf,
            as_attachment=True,
            download_name=f"contract_{contract_id}.pdf",
            mimetype='application/pdf'
        )
    return "Contract not found"

if __name__ == '__main__':
    app.run(debug=True)